package com.zyndex.subscription;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DbInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;

    public DbInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        // 1. Create plans table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS plans (
                  id VARCHAR(50) NOT NULL,
                  name VARCHAR(100) NOT NULL,
                  description TEXT NULL,
                  price_paise BIGINT NOT NULL,
                  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                  billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTH',
                  active BOOLEAN NOT NULL DEFAULT TRUE,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);

        // 2. Create subscriptions table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                  id VARCHAR(50) NOT NULL,
                  user_id BIGINT NOT NULL,
                  plan_id VARCHAR(50) NOT NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'FREE',
                  start_date DATETIME(6) NULL,
                  end_date DATETIME(6) NULL,
                  auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
                  gateway_customer_id VARCHAR(100) NULL,
                  gateway_subscription_id VARCHAR(100) NULL,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);

        addColumnIfNotExists("subscriptions", "reminder_email_sent", "BOOLEAN NOT NULL DEFAULT FALSE");
        // 3. Create payments table
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS payments (
                  id VARCHAR(50) NOT NULL,
                  user_id BIGINT NOT NULL,
                  subscription_id VARCHAR(50) NULL,
                  gateway_payment_id VARCHAR(100) NOT NULL,
                  gateway_order_id VARCHAR(100) NULL,
                  amount_paise BIGINT NOT NULL,
                  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
                  payment_method VARCHAR(30) NOT NULL,
                  status VARCHAR(30) NOT NULL,
                  paid_at DATETIME(6) NULL,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id),
                  UNIQUE KEY uq_gateway_payment (gateway_payment_id)
                )
                """);

        // Run migrations for existing payments table columns
        try {
            jdbc.execute("ALTER TABLE payments MODIFY COLUMN gateway_payment_id VARCHAR(100) NULL");
        } catch (Exception ignored) {}
        addColumnIfNotExists("payments", "order_id", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "gateway", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "gateway_qr_id", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "gateway_event_id", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "utr", "VARCHAR(64) NULL");
        addColumnIfNotExists("payments", "verification_level", "INT NOT NULL DEFAULT 0");
        addColumnIfNotExists("payments", "verification_tag", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "failure_reason", "VARCHAR(255) NULL");
        addColumnIfNotExists("payments", "review_reason", "VARCHAR(255) NULL");
        addColumnIfNotExists("payments", "idempotency_key", "VARCHAR(100) NULL");
        addColumnIfNotExists("payments", "plan_id", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "previous_plan", "VARCHAR(50) NULL");
        addColumnIfNotExists("payments", "expires_at", "DATETIME(6) NULL");
        addColumnIfNotExists("payments", "receipt_email_sent", "BOOLEAN NOT NULL DEFAULT FALSE");
        addColumnIfNotExists("payments", "updated_at", "TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)");
        addUniqueIndexIfNotExists("payments", "uq_gateway_event", "gateway_event_id");
        addUniqueIndexIfNotExists("payments", "uq_payment_order_id", "order_id");

        // 4. Create payment_webhook_deliveries table for deduplication and retry idempotency
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS payment_webhook_deliveries (
                  delivery_id VARCHAR(100) NOT NULL,
                  payment_id VARCHAR(100) NULL,
                  order_id VARCHAR(100) NULL,
                  event_type VARCHAR(50) NOT NULL,
                  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
                  payload TEXT NULL,
                  status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED',
                  processed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (delivery_id)
                )
                """);

        // 5. Create payment_audit_logs table for financial transaction auditing
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS payment_audit_logs (
                  id BIGINT AUTO_INCREMENT NOT NULL,
                  payment_id VARCHAR(100) NULL,
                  order_id VARCHAR(100) NULL,
                  user_id BIGINT NULL,
                  event_type VARCHAR(50) NOT NULL,
                  from_status VARCHAR(30) NULL,
                  to_status VARCHAR(30) NULL,
                  utr VARCHAR(64) NULL,
                  details TEXT NULL,
                  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);

        // 6. Seed default plans
        seedPlan("FREE", "Free / Demo", "Explore the platform with limited previews", 0L, "Forever");
        seedPlan("STUDENT_BASIC", "Student Basic", "Online reading for individual students", 9900L, "MONTH");
        seedPlan("STUDENT_PLUS", "Student Plus", "Entire catalog with offline browser saving", 19900L, "MONTH");
        seedPlan("RESEARCHER_PRO", "PhD Scholar / Researcher", "Complete research collection and downloads", 49900L, "MONTH");
        seedPlan("UNIVERSITY", "Academic Faculty & Educator", "Complete academic catalog for professors & academic mentors", 99900L, "MONTH");
        seedPlan("ENTERPRISE", "Distinguished Fellow & Scholar", "Priority research access for postdoctoral fellows & senior researchers", 199900L, "MONTH");
    }

    private void addColumnIfNotExists(String tableName, String columnName, String columnDefinition) {
        try {
            String sql = "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = ? AND column_name = ? AND table_schema = DATABASE()";
            Integer count = jdbc.queryForObject(sql, Integer.class, tableName, columnName);
            if (count == null || count == 0) {
                jdbc.execute("ALTER TABLE " + tableName + " ADD COLUMN " + columnName + " " + columnDefinition);
            }
        } catch (Exception e) {
            System.err.println("Migration warning: failed to add column " + columnName + " to " + tableName + ": " + e.getMessage());
        }
    }

    private void addUniqueIndexIfNotExists(String tableName, String indexName, String columns) {
        try {
            String sql = "SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = ? AND index_name = ? AND table_schema = DATABASE()";
            Integer count = jdbc.queryForObject(sql, Integer.class, tableName, indexName);
            if (count == null || count == 0) {
                jdbc.execute("ALTER TABLE " + tableName + " ADD UNIQUE INDEX " + indexName + " (" + columns + ")");
            }
        } catch (Exception e) {
            System.err.println("Migration warning: failed to add unique index " + indexName + " to " + tableName + ": " + e.getMessage());
        }
    }

    private void seedPlan(String id, String name, String desc, long price, String interval) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM plans WHERE id = ?", Integer.class, id);
        if (count == null || count == 0) {
            jdbc.update("INSERT INTO plans (id, name, description, price_paise, billing_interval) VALUES (?, ?, ?, ?, ?)",
                    id, name, desc, price, interval);
        }
    }
}
