package com.zyndex.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * MidnightDailySessionScheduler
 * Runs automatically at 00:00:00 (12:00 AM) IST every single day.
 * Performs the daily 24-hour cycle boundary actions:
 * 1. Purges all expired trusted devices so the browser asks for OTP verification afresh on the new day.
 * 2. Invalidates active user sessions across the platform by incrementing session_token_version (while safely exempting the primary administrator).
 * 3. Records an audit log entry in system_logs.
 */
@Component
public class MidnightDailySessionScheduler {

    private static final Logger log = LoggerFactory.getLogger(MidnightDailySessionScheduler.class);

    private final JdbcTemplate jdbc;
    private final AppProperties properties;

    public MidnightDailySessionScheduler(JdbcTemplate jdbc, AppProperties properties) {
        this.jdbc = jdbc;
        this.properties = properties;
    }

    // Cron triggers every day at 12:00:00 AM (00:00) Indian Standard Time (Asia/Kolkata)
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void executeMidnightDailyReset() {
        ZonedDateTime nowIst = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        log.info("[DAILY MIDNIGHT IST RESET] Executing daily cycle boundary check at: {}", nowIst);

        try {
            // 1. Purge all trusted device registrations whose expires_at has passed
            int deletedDevices = jdbc.update("DELETE FROM trusted_devices WHERE expires_at <= NOW()");
            log.info("[DAILY MIDNIGHT IST RESET] Expired {} trusted device registrations.", deletedDevices);

            // 2. Invalidate sessions across all standard users and non-primary admins
            var adminRows = jdbc.queryForList("SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", properties.mainAdminEmail());
            long primaryAdminId = adminRows.isEmpty() ? 0L : AuthSupport.number(adminRows.get(0).get("id"));

            int updatedSessions = jdbc.update(
                    "UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id != ?",
                    primaryAdminId
            );
            log.info("[DAILY MIDNIGHT IST RESET] Successfully incremented session version for {} non-primary accounts.", updatedSessions);

            // 3. Log audit event
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'INFO', 'DAILY_MIDNIGHT_RESET', 'system', ?, '127.0.0.1', 'SUCCESS')
                    """,
                    "Daily 12:00 AM IST cycle reset completed. Expired devices purged (" + deletedDevices +
                    ") and non-primary sessions reset (" + updatedSessions + " accounts)."
            );
        } catch (Exception e) {
            log.error("[DAILY MIDNIGHT IST RESET] Error during midnight reset: {}", e.getMessage(), e);
        }
    }
}
