package com.zyndex.usage;

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
                CREATE TABLE IF NOT EXISTS downloads (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  downloaded_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS resource_views (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  viewed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS usages (
                  usage_id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  content_id BIGINT NOT NULL,
                  duration INT NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (usage_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS usage_records (
                  usage_id BIGINT NOT NULL AUTO_INCREMENT,
                  user_id BIGINT NOT NULL,
                  content_id BIGINT NOT NULL,
                  duration INT NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (usage_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        // No demo/fake usages are seeded. Real reading telemetry is recorded dynamically as users read resources.
    }
}
