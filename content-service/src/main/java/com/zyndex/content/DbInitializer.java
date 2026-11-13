package com.zyndex.content;

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
                CREATE TABLE IF NOT EXISTS resources (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  approved BOOLEAN NOT NULL DEFAULT TRUE,
                  downloads_count BIGINT NOT NULL DEFAULT 0,
                  rating DOUBLE NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  updated_at DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                  uploaded_by BIGINT NOT NULL,
                  description LONGTEXT NULL,
                  article_content LONGTEXT NULL,
                  author VARCHAR(190) NULL,
                  category VARCHAR(120) NOT NULL,
                  file_url VARCHAR(500) NULL,
                  image_url VARCHAR(500) NULL,
                  title VARCHAR(255) NOT NULL,
                  type VARCHAR(40) NOT NULL DEFAULT 'TEXTBOOK',
                  required_plan VARCHAR(50) NOT NULL DEFAULT 'FREE',
                  PRIMARY KEY (id)
                )
                """);
        try {
            jdbc.execute("ALTER TABLE resources ADD COLUMN required_plan VARCHAR(50) NOT NULL DEFAULT 'FREE'");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE resources MODIFY COLUMN description LONGTEXT NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE resources ADD COLUMN article_content LONGTEXT NULL");
        } catch (Exception ignored) {}
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS saved_resources (
                  resource_id BIGINT NOT NULL,
                  saved_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  user_id BIGINT NOT NULL,
                  PRIMARY KEY (resource_id, user_id),
                  CONSTRAINT fk_saved_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS feedback (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  rating INT NOT NULL DEFAULT 0,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  comment TEXT NULL,
                  admin_response TEXT NULL,
                  responded_at DATETIME(6) NULL,
                  PRIMARY KEY (id),
                  CONSTRAINT fk_feedback_resource FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
                )
                """);
        try {
            jdbc.execute("ALTER TABLE feedback ADD COLUMN admin_response TEXT NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE feedback ADD COLUMN responded_at DATETIME(6) NULL");
        } catch (Exception ignored) {}
        try {
            jdbc.execute("ALTER TABLE feedback ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT FALSE");
        } catch (Exception ignored) {}
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS contacts (
                  id BIGINT NOT NULL AUTO_INCREMENT,
                  name VARCHAR(120) NOT NULL,
                  email VARCHAR(190) NOT NULL,
                  subject VARCHAR(255) NOT NULL,
                  message TEXT NOT NULL,
                  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                  PRIMARY KEY (id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS download_tokens (
                  token VARCHAR(100) NOT NULL,
                  resource_id BIGINT NOT NULL,
                  user_id BIGINT NOT NULL,
                  role VARCHAR(50) NOT NULL,
                  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (token)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS content (
                  content_id BIGINT NOT NULL AUTO_INCREMENT,
                  title VARCHAR(255) NOT NULL,
                  type VARCHAR(50) NOT NULL DEFAULT 'TEXTBOOK',
                  author VARCHAR(190) NULL,
                  PRIMARY KEY (content_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """);
        try {
            jdbc.execute("""
                    INSERT IGNORE INTO content (content_id, title, type, author)
                    SELECT id, title, type, author FROM resources
                    """);
            Long contentCount = jdbc.queryForObject("SELECT COUNT(*) FROM content", Long.class);
            if (contentCount == null || contentCount == 0) {
                jdbc.execute("""
                        INSERT INTO content (title, type, author) VALUES 
                        ('Introduction to Artificial Intelligence & Neural Networks', 'TEXTBOOK', 'Dr. Arthur Samuel'),
                        ('Advanced Quantum Algorithms and Computational Physics', 'RESEARCH_PAPER', 'Prof. Richard Feynman'),
                        ('Distributed Systems Architecture: Patterns and Principles', 'HANDBOOK', 'Martin Fowler'),
                        ('Principles of Financial Mathematics & Stochastic Calculus', 'TEXTBOOK', 'Dr. Fischer Black'),
                        ('Full-Stack Cloud Microservices & Distributed Observability', 'TEXTBOOK', 'ScholarSphere Research Team')
                        """);
            }
        } catch (Exception ignored) {}
    }
}
