package com.zyndex.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final AppProperties properties;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    DbInitializer(JdbcTemplate jdbc, AppProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                 CREATE TABLE IF NOT EXISTS users (
                   id BIGINT NOT NULL AUTO_INCREMENT,
                   created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                   updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                   email VARCHAR(190) NOT NULL UNIQUE,
                   password VARCHAR(255) NOT NULL,
                   username VARCHAR(120) NOT NULL,
                   role VARCHAR(30) NOT NULL DEFAULT 'STUDENT',
                   bio TEXT NULL,
                   registration_no VARCHAR(80) NULL,
                   user_type VARCHAR(80) NULL,
                   profession VARCHAR(160) NULL,
                   college_name VARCHAR(255) NULL,
                   university_name VARCHAR(255) NULL,
                   active BOOLEAN NOT NULL DEFAULT TRUE,
                   PRIMARY KEY (id)
                 )
                 """);
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN college_name VARCHAR(255) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN university_name VARCHAR(255) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN user_type VARCHAR(80) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN profession VARCHAR(160) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN last_active_at DATETIME(6) NULL");
        } catch (Exception ignored) {}
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS admin_requests (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  full_name VARCHAR(120) NOT NULL,
                  display_name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'pending',
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                                    reviewed_at DATETIME(6) NULL,
                                    decline_reason TEXT NULL,
                  PRIMARY KEY (id)
                )
                """);
                try { jdbc.execute("ALTER TABLE admin_requests ADD COLUMN reviewed_at DATETIME(6) NULL"); } catch (Exception ignored) {}
                try { jdbc.execute("ALTER TABLE admin_requests ADD COLUMN decline_reason TEXT NULL"); } catch (Exception ignored) {}
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_requests (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  full_name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  role VARCHAR(30) NOT NULL,
                  previous_password VARCHAR(255) NULL,
                  new_password_hash VARCHAR(255) NOT NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS system_logs (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  service VARCHAR(60) NOT NULL,
                  level VARCHAR(20) NOT NULL DEFAULT 'INFO',
                  action VARCHAR(100) NOT NULL,
                  actor_email VARCHAR(190) NULL,
                  details TEXT NULL,
                  ip_address VARCHAR(80) NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
                  response_time_ms INT NULL DEFAULT NULL,
                  PRIMARY KEY (id),
                  INDEX idx_syslogs_service (service),
                  INDEX idx_syslogs_level (level),
                  INDEX idx_syslogs_time (timestamp)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS trusted_devices (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  device_token VARCHAR(255) NOT NULL,
                  device_name VARCHAR(120) NULL,
                  browser VARCHAR(80) NULL,
                  operating_system VARCHAR(80) NULL,
                  ip_address VARCHAR(80) NULL,
                  trusted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  expires_at DATETIME(6) NOT NULL,
                  PRIMARY KEY (id),
                  INDEX idx_trusted_lookup (email, device_token),
                  INDEX idx_trusted_expiry (expires_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS system_settings (
                  setting_key VARCHAR(80) NOT NULL,
                  setting_value TEXT NULL,
                  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  updated_by VARCHAR(190) NULL,
                  PRIMARY KEY (setting_key)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                  user_id BIGINT NOT NULL,
                  citation_style VARCHAR(30) NOT NULL DEFAULT 'APA 7th',
                  reader_theme VARCHAR(30) NOT NULL DEFAULT 'light',
                  reader_font_scale INT NOT NULL DEFAULT 100,
                  notify_new_releases BOOLEAN NOT NULL DEFAULT TRUE,
                  notify_expiry_reminders BOOLEAN NOT NULL DEFAULT TRUE,
                  notify_security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
                  admin_notify_access_requests BOOLEAN NOT NULL DEFAULT TRUE,
                  admin_notify_bank_utr BOOLEAN NOT NULL DEFAULT TRUE,
                  admin_notify_rate_limit_spikes BOOLEAN NOT NULL DEFAULT TRUE,
                  admin_notify_account_deletions BOOLEAN NOT NULL DEFAULT TRUE,
                  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN session_token_version INT NOT NULL DEFAULT 1");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN session_invalidation_reason VARCHAR(100) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE users ADD COLUMN is_terminated BOOLEAN NOT NULL DEFAULT FALSE");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE trusted_devices ADD COLUMN is_trusted BOOLEAN NOT NULL DEFAULT TRUE");
        } catch (Exception ignored) {}
        seedInitialLogsIfEmpty();
        ensureMainAdmin();
    }

    private void seedInitialLogsIfEmpty() {
        // No fake or demo logs are seeded. Real events are logged dynamically as users and admins interact with the system.
    }

    private void ensureMainAdmin() {
        String query = "SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1";
        var rows = jdbc.queryForList(query, properties.mainAdminEmail());
        Long id = null;
        if (!rows.isEmpty()) {
            Object val = rows.get(0).values().iterator().next();
            id = val == null ? null : ((Number) val).longValue();
        }

        String passwordHash = passwordEncoder.encode(properties.mainAdminPassword());
        if (id != null) {
            jdbc.update("UPDATE users SET role = 'ADMIN', password = ? WHERE id = ?", passwordHash, id);
            return;
        }
        jdbc.update("INSERT INTO users (created_at, email, password, username, role) VALUES (NOW(), ?, ?, ?, 'ADMIN')",
                properties.mainAdminEmail(), passwordHash, properties.mainAdminName());
    }
}
