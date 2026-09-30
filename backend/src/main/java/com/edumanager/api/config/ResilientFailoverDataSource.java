package com.edumanager.api.config;

import com.zaxxer.hikari.HikariDataSource;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.SQLFeatureNotSupportedException;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Logger;

@Slf4j
public class ResilientFailoverDataSource implements DataSource {

    @Getter
    private final HikariDataSource primaryDataSource;
    @Getter
    private final HikariDataSource backupDataSource;

    private final AtomicBoolean usingBackup = new AtomicBoolean(false);
    private volatile long lastPrimaryProbeTime = 0;
    private static final long PROBE_INTERVAL_MS = 60_000; // Kiểm tra lại Primary mỗi 60 giây khi đang ở chế độ Failover

    @Getter
    private volatile LocalDateTime lastFailoverTime = null;
    @Getter
    private volatile LocalDateTime lastRecoveryTime = null;
    @Getter
    private volatile String lastFailoverReason = null;

    public ResilientFailoverDataSource(HikariDataSource primaryDataSource, HikariDataSource backupDataSource) {
        this.primaryDataSource = primaryDataSource;
        this.backupDataSource = backupDataSource;
    }

    public boolean isUsingBackup() {
        return usingBackup.get();
    }

    public String getActiveDataSourceName() {
        return usingBackup.get() ? "BACKUP (Neon Secondary)" : "PRIMARY (Neon Main)";
    }

    @Override
    public Connection getConnection() throws SQLException {
        return getResilientConnection(null, null);
    }

    @Override
    public Connection getConnection(String username, String password) throws SQLException {
        return getResilientConnection(username, password);
    }

    private Connection getResilientConnection(String username, String password) throws SQLException {
        long now = System.currentTimeMillis();

        // 1. Nếu đang dùng Backup, định kỳ thử probe lại Primary xem đã phục hồi chưa (VD: sau 7h sáng khi reset quota)
        if (usingBackup.get()) {
            if (now - lastPrimaryProbeTime > PROBE_INTERVAL_MS) {
                lastPrimaryProbeTime = now;
                try {
                    Connection probe = openConnection(primaryDataSource, username, password);
                    // Probe thành công -> Phục hồi về Primary
                    usingBackup.set(false);
                    lastRecoveryTime = LocalDateTime.now();
                    log.info("🎉 [DATABASE FAILOVER] Cơ sở dữ liệu Primary (Neon chính) đã hoạt động bình thường trở lại! Đã tự động chuyển mạch về Primary.");
                    return probe;
                } catch (Exception probeErr) {
                    log.debug("[DATABASE FAILOVER] Primary vẫn chưa sẵn sàng ({}). Tiếp tục sử dụng Backup.", probeErr.getMessage());
                }
            }
            return openConnection(backupDataSource, username, password);
        }

        // 2. Nếu đang dùng Primary, thử lấy kết nối
        try {
            return openConnection(primaryDataSource, username, password);
        } catch (SQLException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            log.warn("⚠️ [DATABASE FAILOVER] Kết nối Primary thất bại ({}). Đang tự động chuyển mạch sang Backup Database...", msg);
            usingBackup.set(true);
            lastFailoverTime = LocalDateTime.now();
            lastFailoverReason = msg;
            lastPrimaryProbeTime = now;

            try {
                Connection backupConn = openConnection(backupDataSource, username, password);
                log.info("✅ [DATABASE FAILOVER] Đã kết nối thành công tới Backup Database (Neon phụ). Hệ thống vận hành liên tục không gián đoạn.");
                return backupConn;
            } catch (SQLException backupErr) {
                log.error("❌ [DATABASE FAILOVER] Cả Primary và Backup database đều không thể kết nối!", backupErr);
                throw backupErr;
            }
        }
    }

    private Connection openConnection(HikariDataSource ds, String username, String password) throws SQLException {
        if (username != null && password != null) {
            return ds.getConnection(username, password);
        }
        return ds.getConnection();
    }

    @Override
    public <T> T unwrap(Class<T> iface) throws SQLException {
        if (iface.isInstance(this)) {
            return iface.cast(this);
        }
        return primaryDataSource.unwrap(iface);
    }

    @Override
    public boolean isWrapperFor(Class<?> iface) throws SQLException {
        return iface.isInstance(this) || primaryDataSource.isWrapperFor(iface);
    }

    @Override
    public PrintWriter getLogWriter() throws SQLException {
        return primaryDataSource.getLogWriter();
    }

    @Override
    public void setLogWriter(PrintWriter out) throws SQLException {
        primaryDataSource.setLogWriter(out);
    }

    @Override
    public void setLoginTimeout(int seconds) throws SQLException {
        primaryDataSource.setLoginTimeout(seconds);
    }

    @Override
    public int getLoginTimeout() throws SQLException {
        return primaryDataSource.getLoginTimeout();
    }

    @Override
    public Logger getParentLogger() throws SQLFeatureNotSupportedException {
        return primaryDataSource.getParentLogger();
    }
}
