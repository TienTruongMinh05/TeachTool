package com.edumanager.api.service;

import com.edumanager.api.config.ResilientFailoverDataSource;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DatabaseBackupSyncService {

    private final DataSource dataSource;

    @Getter
    private volatile LocalDateTime lastSyncTime = null;
    @Getter
    private volatile String lastSyncStatus = "Chưa đồng bộ lần nào";
    @Getter
    private volatile Map<String, Integer> lastSyncDetail = new LinkedHashMap<>();

    private volatile long lastSyncAttemptTime = 0;

    /**
     * [EGRESS OPTIMIZATION]
     * Chỉ đồng bộ các bảng dữ liệu nghiệp vụ có cấu trúc nhẹ (Text/Metadata).
     * Tuyệt đối KHÔNG đồng bộ 'stored_file_chunks' (309 MB bytea) qua cron để bảo vệ 100% hạn ngạch mạng (Neon Network Transfer Quota).
     */
    private static final List<String> TABLE_ORDER = List.of(
            "users",
            "classes",
            "class_teachers",
            "enrollments",
            "sessions",
            "assignments",
            "attendances",
            "submissions",
            "submission_feedback_comments",
            "class_announcements",
            "class_materials",
            "teaching_plans",
            "teaching_plan_sections",
            "inquiry_threads",
            "inquiry_messages",
            "stored_files",
            "activity_templates"
    );

    /**
     * Tự động sao lưu đồng bộ dữ liệu nghiệp vụ từ Primary sang Backup mỗi 12 tiếng (00:00 và 12:00)
     * Tổng dung lượng truyền tải mỗi lần chỉ khoảng ~500 KB (khoảng 30 MB / tháng, tức 0.6% của quota 5 GB).
     */
    @Scheduled(cron = "0 0 0,12 * * *")
    public void scheduled12HourBackup() {
        log.info("⏰ [BACKUP SYNC] Bắt đầu tác vụ sao lưu nghiệp vụ định kỳ 12 giờ một lần từ Primary sang Backup...");
        syncPrimaryToBackup(false);
    }

    /**
     * Kiểm tra một lần lúc 07:15 sáng (sau khung giờ reset hạn mức Neon 07:00).
     * Chỉ chạy nếu đã qua hơn 6 tiếng kể từ lần chạy gần nhất.
     */
    @Scheduled(cron = "0 15 7 * * *")
    public void scheduledRecoverySyncCheck() {
        long now = System.currentTimeMillis();
        if (now - lastSyncAttemptTime < 6 * 3600_000L) {
            log.debug("[BACKUP SYNC CHECK] Vừa đồng bộ trong vòng 6 giờ qua. Bỏ qua kiểm tra 07:15.");
            return;
        }

        if (dataSource instanceof ResilientFailoverDataSource) {
            log.info("🔍 [BACKUP SYNC CHECK] Kiểm tra đồng bộ sau giờ reset quota 07:00...");
            syncPrimaryToBackup(true);
        }
    }

    /**
     * Thực hiện đồng bộ toàn bộ bảng dữ liệu nghiệp vụ từ Primary sang Backup
     */
    public synchronized Map<String, Object> syncPrimaryToBackup(boolean silentOnUnavailable) {
        Map<String, Object> result = new LinkedHashMap<>();
        this.lastSyncAttemptTime = System.currentTimeMillis();

        if (!(dataSource instanceof ResilientFailoverDataSource failoverDs)) {
            result.put("success", false);
            result.put("message", "DataSource không thuộc kiểu ResilientFailoverDataSource.");
            return result;
        }

        log.info("🔄 [BACKUP SYNC] Đang kết nối tới Primary và Backup để đồng bộ dữ liệu nghiệp vụ (Zero-Blob Egress)...");

        try (Connection srcConn = failoverDs.getPrimaryDataSource().getConnection();
             Connection tgtConn = failoverDs.getBackupDataSource().getConnection()) {

            srcConn.setReadOnly(true);
            tgtConn.setAutoCommit(false);

            // 1. Lấy danh sách cột thực tế của từng bảng ở Target DB
            Map<String, Set<String>> targetTableCols = getTableColumns(tgtConn);
            Map<String, Integer> syncStats = new LinkedHashMap<>();
            int totalSyncedRows = 0;

            for (String tableName : TABLE_ORDER) {
                Set<String> validCols = targetTableCols.get(tableName);
                if (validCols == null || validCols.isEmpty()) {
                    continue;
                }

                int tableSynced = syncTable(srcConn, tgtConn, tableName, validCols);
                syncStats.put(tableName, tableSynced);
                totalSyncedRows += tableSynced;
            }

            // 2. Cập nhật sequence các khóa chính tự tăng (auto-increment)
            updateTargetSequences(tgtConn);

            tgtConn.commit();

            this.lastSyncTime = LocalDateTime.now();
            this.lastSyncStatus = "Thành công (" + totalSyncedRows + " bản ghi)";
            this.lastSyncDetail = syncStats;

            log.info("✅ [BACKUP SYNC HOÀN TẤT] Đã đồng bộ {} bản ghi từ Primary sang Backup. Chi tiết: {}", totalSyncedRows, syncStats);

            result.put("success", true);
            result.put("message", "Đồng bộ thành công " + totalSyncedRows + " bản ghi.");
            result.put("timestamp", lastSyncTime);
            result.put("details", syncStats);
            return result;

        } catch (SQLException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (silentOnUnavailable && (msg.contains("quota") || msg.contains("exceeded") || msg.contains("timeout") || msg.contains("suspension"))) {
                log.info("[BACKUP SYNC] Primary hiện đang tạm ngắt ({}), hệ thống sẽ chạy an toàn trên Backup và thử lại sau.", msg);
            } else {
                log.warn("⚠️ [BACKUP SYNC] Quá trình đồng bộ thất bại: {}", msg);
            }
            this.lastSyncStatus = "Thất bại: " + msg;
            result.put("success", false);
            result.put("message", "Lỗi: " + msg);
            return result;
        }
    }

    private int syncTable(Connection srcConn, Connection tgtConn, String tableName, Set<String> targetCols) throws SQLException {
        // Lấy metadata các cột từ source
        List<String> commonCols = new ArrayList<>();
        DatabaseMetaData meta = srcConn.getMetaData();
        try (ResultSet colsRs = meta.getColumns(null, "public", tableName, null)) {
            while (colsRs.next()) {
                String colName = colsRs.getString("COLUMN_NAME");
                // [EGRESS OPTIMIZATION]: Tuyệt đối KHÔNG SELECT cột nhị phân 'data' của bảng 'stored_files'
                if ("stored_files".equalsIgnoreCase(tableName) && "data".equalsIgnoreCase(colName)) {
                    continue;
                }
                if (targetCols.contains(colName)) {
                    commonCols.add(colName);
                }
            }
        }

        if (commonCols.isEmpty()) {
            return 0;
        }

        // [EGRESS OPTIMIZATION]: Chỉ SELECT danh sách cột cần thiết, KHÔNG dùng SELECT *
        String selectColsSql = commonCols.stream().map(c -> "\"" + c + "\"").collect(Collectors.joining(", "));
        String selectSql = "SELECT " + selectColsSql + " FROM \"" + tableName + "\"";

        StringBuilder insertSql = new StringBuilder("INSERT INTO \"").append(tableName).append("\" (");
        StringBuilder valuesSql = new StringBuilder(" VALUES (");
        for (int i = 0; i < commonCols.size(); i++) {
            if (i > 0) {
                insertSql.append(", ");
                valuesSql.append(", ");
            }
            insertSql.append("\"").append(commonCols.get(i)).append("\"");
            valuesSql.append("?");
        }
        insertSql.append(")").append(valuesSql).append(")");
        insertSql.append(" ON CONFLICT DO NOTHING");

        int count = 0;
        try (Statement srcStmt = srcConn.createStatement()) {
            srcStmt.setFetchSize(100);
            try (ResultSet rs = srcStmt.executeQuery(selectSql);
                 PreparedStatement pstmt = tgtConn.prepareStatement(insertSql.toString())) {

                while (rs.next()) {
                    for (int i = 0; i < commonCols.size(); i++) {
                        pstmt.setObject(i + 1, rs.getObject(i + 1));
                    }
                    pstmt.addBatch();
                    count++;
                    if (count % 50 == 0) {
                        pstmt.executeBatch();
                    }
                }
                pstmt.executeBatch();
            }
        }
        return count;
    }

    private Map<String, Set<String>> getTableColumns(Connection conn) throws SQLException {
        Map<String, Set<String>> tableCols = new HashMap<>();
        String query = "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'";
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(query)) {
            while (rs.next()) {
                String t = rs.getString("table_name");
                String c = rs.getString("column_name");
                tableCols.computeIfAbsent(t, k -> new HashSet<>()).add(c);
            }
        }
        return tableCols;
    }

    private void updateTargetSequences(Connection conn) {
        String seqQuery = "SELECT table_name, column_name, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND column_default LIKE 'nextval%'";
        try (Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(seqQuery)) {
            while (rs.next()) {
                String table = rs.getString("table_name");
                String col = rs.getString("column_name");
                String def = rs.getString("column_default");
                try {
                    String seqName = def.substring(def.indexOf("'") + 1, def.lastIndexOf("'"));
                    String updateSeqSql = "SELECT setval('" + seqName + "', COALESCE((SELECT MAX(\"" + col + "\") FROM \"" + table + "\"), 0) + 1, false)";
                    try (Statement updateStmt = conn.createStatement()) {
                        updateStmt.execute(updateSeqSql);
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            log.warn("Lỗi cập nhật sequence: {}", e.getMessage());
        }
    }
}
