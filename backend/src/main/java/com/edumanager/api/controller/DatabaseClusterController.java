package com.edumanager.api.controller;

import com.edumanager.api.config.ResilientFailoverDataSource;
import com.edumanager.api.service.DatabaseBackupSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system/database")
@RequiredArgsConstructor
public class DatabaseClusterController {

    private final DataSource dataSource;
    private final DatabaseBackupSyncService syncService;

    @GetMapping("/status")
    public ResponseEntity<?> getDatabaseStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        if (dataSource instanceof ResilientFailoverDataSource failoverDs) {
            status.put("activeNode", failoverDs.getActiveDataSourceName());
            status.put("isUsingBackup", failoverDs.isUsingBackup());
            status.put("lastFailoverTime", failoverDs.getLastFailoverTime());
            status.put("lastFailoverReason", failoverDs.getLastFailoverReason());
            status.put("lastRecoveryTime", failoverDs.getLastRecoveryTime());
        } else {
            status.put("activeNode", "Standard Single DataSource");
        }

        status.put("lastSyncTime", syncService.getLastSyncTime());
        status.put("lastSyncStatus", syncService.getLastSyncStatus());
        status.put("lastSyncDetail", syncService.getLastSyncDetail());
        status.put("backupSchedule", "Tự động sao lưu mỗi 12 tiếng (00:00 và 12:00 hằng ngày) + Tự động đồng bộ sau phục hồi");

        return ResponseEntity.ok(status);
    }

    @PostMapping("/sync")
    public ResponseEntity<?> triggerManualSync() {
        Map<String, Object> syncResult = syncService.syncPrimaryToBackup(false);
        return ResponseEntity.ok(syncResult);
    }
}
