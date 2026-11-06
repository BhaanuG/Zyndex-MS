package com.zyndex.access;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    DbInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS access_entitlements (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  resource_id BIGINT NULL,
                  permission VARCHAR(50) NOT NULL,
                  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                  expires_at DATETIME(6) NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS access (
                  access_id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  content_id BIGINT NOT NULL,
                  access_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (access_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        try {
            jdbc.execute("""
                    INSERT IGNORE INTO access (access_id, user_id, content_id, access_status, created_at)
                    SELECT id, user_id, COALESCE(resource_id, 1), status, created_at FROM access_entitlements
                    """);
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM access", Long.class);
            if (count == null || count == 0) {
                jdbc.execute("""
                        INSERT INTO access (user_id, content_id, access_status) VALUES
                        (1, 1, 'ACTIVE'),
                        (1, 2, 'ACTIVE'),
                        (1, 3, 'ACTIVE'),
                        (2, 1, 'ACTIVE'),
                        (2, 4, 'ACTIVE')
                        """);
            }
        } catch (Exception ignored) {}
    }
}
