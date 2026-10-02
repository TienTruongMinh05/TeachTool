package com.edumanager.api.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Slf4j
@Configuration
public class DataSourceConfig {

    @Value("${app.datasource.primary.url:${SPRING_DATASOURCE_URL:jdbc:postgresql://ep-noisy-bar-b3e3g4u2-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require}}")
    private String primaryUrl;

    @Value("${app.datasource.primary.username:${SPRING_DATASOURCE_USERNAME:neondb_owner}}")
    private String primaryUsername;

    @Value("${app.datasource.primary.password:${SPRING_DATASOURCE_PASSWORD:npg_6ECboSUKN8zG}}")
    private String primaryPassword;

    @Value("${app.datasource.backup.url:${APP_DATASOURCE_BACKUP_URL:jdbc:postgresql://ep-late-cell-az0mlnlc-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require}}")
    private String backupUrl;

    @Value("${app.datasource.backup.username:${APP_DATASOURCE_BACKUP_USERNAME:neondb_owner}}")
    private String backupUsername;

    @Value("${app.datasource.backup.password:${APP_DATASOURCE_BACKUP_PASSWORD:npg_WnOZJET75upC}}")
    private String backupPassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        log.info("🔌 Khởi tạo hệ thống Dynamic Failover DataSource:");
        log.info("   -> Primary Node: {}", maskUrl(primaryUrl));

        HikariDataSource primaryDs = createHikariDataSource("HikariPool-Primary", primaryUrl, primaryUsername, primaryPassword);

        if (backupUrl == null || backupUrl.isBlank()) {
            log.warn("⚠️ [DATASOURCE] Biến môi trường APP_DATASOURCE_BACKUP_URL chưa được cấu hình. Chạy chế độ Single Node (không có Failover).");
            return primaryDs;
        }

        log.info("   -> Backup Node:  {}", maskUrl(backupUrl));
        HikariDataSource backupDs = createHikariDataSource("HikariPool-Backup", backupUrl, backupUsername, backupPassword);

        return new ResilientFailoverDataSource(primaryDs, backupDs);
    }

    private HikariDataSource createHikariDataSource(String poolName, String url, String username, String password) {
        HikariConfig config = new HikariConfig();
        config.setPoolName(poolName);
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");

        // Tối ưu hóa kết nối Neon Serverless
        config.setMinimumIdle(0);
        config.setMaximumPoolSize(5);
        config.setIdleTimeout(60000);
        config.setMaxLifetime(300000);
        config.setConnectionTimeout(20000); // 20s timeout đủ cho serverless compute đánh thức (wake up)
        config.setInitializationFailTimeout(-1); // Không crash Spring Boot khi khởi động nếu một trong 2 DB đang tạm ngắt

        return new HikariDataSource(config);
    }

    private String maskUrl(String url) {
        if (url == null) return "N/A";
        return url.replaceAll("//.*@", "//***:***@");
    }
}
