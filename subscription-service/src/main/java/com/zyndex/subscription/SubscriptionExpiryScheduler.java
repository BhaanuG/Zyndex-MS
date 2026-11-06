package com.zyndex.subscription;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Scheduled service to:
 * 1. Automatically expire subscriptions when end_date is reached and downgrade entitlements to FREE.
 * 2. Send advance reminder emails to users 1 day (24 hours) before their subscription ends.
 */
@Service
public class SubscriptionExpiryScheduler {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionExpiryScheduler.class);

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;
    private final JavaMailSender mailSender;

    @Value("${zyndex.otp-mail-from:}")
    private String mailFrom;

    public SubscriptionExpiryScheduler(
            JdbcTemplate jdbc,
            RestTemplate restTemplate,
            JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
        this.mailSender = mailSender;
    }

    /**
     * Check every 5 minutes for expired subscriptions and automatically revert them to FREE.
     */
    @Scheduled(fixedRate = 300000, initialDelay = 15000)
    public void processExpiredSubscriptions() {
        try {
            // Find active subscriptions whose end_date has passed
            List<Map<String, Object>> expiredSubs = jdbc.queryForList("""
                    SELECT s.id, s.user_id, s.plan_id, s.end_date,
                           COALESCE(u.username, CONCAT('User #', s.user_id)) AS user_name,
                           u.email AS user_email
                    FROM subscriptions s
                    LEFT JOIN zyndex_auth.users u ON s.user_id = u.id
                    WHERE s.status = 'ACTIVE' 
                      AND s.end_date IS NOT NULL 
                      AND s.end_date <= NOW()
                    """);

            for (Map<String, Object> sub : expiredSubs) {
                String subId = String.valueOf(sub.get("id"));
                Long userId = ((Number) sub.get("user_id")).longValue();
                String planId = String.valueOf(sub.get("plan_id"));
                String userEmail = sub.get("user_email") != null ? String.valueOf(sub.get("user_email")) : null;
                String userName = String.valueOf(sub.get("user_name"));

                log.info("Subscription {} for user {} ({}) has expired. Automatically reverting to Free plan.", subId, userId, userEmail);

                // 1. Mark subscription as EXPIRED
                jdbc.update("UPDATE subscriptions SET status = 'EXPIRED', auto_renew = FALSE WHERE id = ?", subId);

                // 2. Synchronize Access Service to revert user entitlement to FREE tier (tier 0)
                try {
                    org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                    headers.set("X-Internal-Service", "subscription-service");
                    org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(
                            Map.of("userId", userId, "plan", "FREE", "durationDays", 36500), headers);
                    restTemplate.postForObject("http://access-service/api/access/subscribe", request, Map.class);
                } catch (Exception e) {
                    log.warn("Failed to reset access entitlement to FREE for user {}: {}", userId, e.getMessage());
                }

                // 3. Send subscription expiration notification email to customer
                if (userEmail != null && !userEmail.isBlank() && !"N/A".equalsIgnoreCase(userEmail)) {
                    sendExpiryNotificationEmail(userName, userEmail, planId);
                }
            }
        } catch (Exception e) {
            log.error("Error running processExpiredSubscriptions scheduler: {}", e.getMessage());
        }
    }

    /**
     * Check every 30 minutes for subscriptions expiring in approximately 24 hours (between 23 and 25 hours away)
     * and send the 1-day advance reminder email.
     */
    @Scheduled(fixedRate = 1800000, initialDelay = 30000)
    public void sendOneDayPlanExpiryReminders() {
        try {
            // Check subscriptions ending between NOW + 23 hours and NOW + 25 hours that have not received reminder yet
            List<Map<String, Object>> expiringSoon = jdbc.queryForList("""
                    SELECT s.id, s.user_id, s.plan_id, s.end_date,
                           COALESCE(u.username, CONCAT('Scholar #', s.user_id)) AS user_name,
                           u.email AS user_email
                    FROM subscriptions s
                    JOIN zyndex_auth.users u ON s.user_id = u.id
                    WHERE s.status = 'ACTIVE'
                      AND s.end_date >= NOW() + INTERVAL 23 HOUR
                      AND s.end_date <= NOW() + INTERVAL 25 HOUR
                      AND (s.reminder_email_sent IS NULL OR s.reminder_email_sent = FALSE)
                    """);

            for (Map<String, Object> sub : expiringSoon) {
                String subId = String.valueOf(sub.get("id"));
                String userName = String.valueOf(sub.get("user_name"));
                String userEmail = String.valueOf(sub.get("user_email"));
                String planId = String.valueOf(sub.get("plan_id"));
                Object endDate = sub.get("end_date");

                if (userEmail != null && !userEmail.isBlank()) {
                    sendReminderEmail(userName, userEmail, planId, endDate);
                    try {
                        jdbc.update("UPDATE subscriptions SET reminder_email_sent = TRUE WHERE id = ?", subId);
                    } catch (Exception ignored) {}
                }
            }
        } catch (Exception e) {
            log.warn("Error running sendOneDayPlanExpiryReminders scheduler: {}", e.getMessage());
        }
    }

    private void sendExpiryNotificationEmail(String userName, String userEmail, String planId) {
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : "support@scholarsphere.com";
            if (!from.contains("<")) {
                helper.setFrom(from, "Zyndex Subscriptions");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(userEmail);
            helper.setSubject("Zyndex Subscription Update: Your " + planId.replace("_", " ") + " Plan Has Ended");

            String text = String.format("""
                    Dear %s,

                    Your Zyndex %s subscription period has ended today.

                    As per our transparent billing policy:
                    - There is NO unexpected auto-renewal or surprise debit.
                    - Your account has been automatically transitioned to our Free Academic Plan.
                    - You can continue exploring open textbooks and previews at any time.

                    To regain unlimited access to full textbooks, research papers, and offline reading, you can upgrade your plan whenever you're ready:
                    http://localhost:5173/pricing

                    Best regards,
                    Zyndex Academic Platform Team
                    """,
                    userName, planId.replace("_", " ")
            );

            String htmlBody = """
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="background: linear-gradient(135deg, #64748b 0%%, #475569 100%%); padding: 28px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Zyndex</h1>
                                <p style="color: #e2e8f0; margin: 6px 0 0 0; font-size: 13px;">Subscription Expiry Notice</p>
                            </div>
                            <div style="padding: 32px 28px;">
                                <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear %s,</p>
                                <p style="margin: 0 0 16px 0; color: #334155;">Your Zyndex <strong>%s</strong> subscription period has ended today.</p>
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #334155;">
                                    <p style="margin: 4px 0;">• <strong>No Surprise Debits:</strong> We do not store payment secrets or auto-charge without consent.</p>
                                    <p style="margin: 4px 0;">• <strong>Graceful Transition:</strong> Your account is safely on the Free Academic tier.</p>
                                    <p style="margin: 4px 0;">• <strong>Continuous Learning:</strong> You can still preview chapters and open academic resources.</p>
                                </div>
                                <p style="margin: 16px 0; font-size: 13px; color: #475569;">To renew or choose another tier, visit the <a href="http://localhost:5173/pricing" style="color: #ea580c; font-weight: 600;">Zyndex Pricing Page</a>.</p>
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b;">
                                    <p style="margin: 0;">Best regards,</p>
                                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                    """.formatted(userName, planId.replace("_", " "));

            helper.setText(text, htmlBody);
            mailSender.send(mimeMessage);
            log.info("Sent plan expiry email to {}", userEmail);
        } catch (Exception e) {
            log.warn("Failed to send expiry notification email to {}: {}", userEmail, e.getMessage());
        }
    }

    private void sendReminderEmail(String userName, String userEmail, String planId, Object endDate) {
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : "support@scholarsphere.com";
            if (!from.contains("<")) {
                helper.setFrom(from, "Zyndex Subscriptions");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(userEmail);
            helper.setSubject("Reminder: 1 Day Left on Your Zyndex " + planId.replace("_", " ") + " Plan");

            String text = String.format("""
                    Dear %s,

                    This is a friendly reminder that your Zyndex %s subscription is scheduled to expire in 24 hours (Valid until: %s).

                    Important information regarding your account:
                    - Zyndex does NOT automatically charge your card or UPI without your consent.
                    - After expiry, your account will smoothly revert to the Free / Demo plan.
                    - If you wish to continue uninterrupted reading and downloads, please renew or choose a plan from the pricing page:
                      http://localhost:5173/pricing

                    Thank you for being part of the Zyndex scholar community!

                    Warm regards,
                    Zyndex Subscriptions & Support
                    """,
                    userName, planId.replace("_", " "), String.valueOf(endDate)
            );

            String htmlBody = """
                    <!DOCTYPE html>
                    <html>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); padding: 28px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Zyndex</h1>
                                <p style="color: #fef3c7; margin: 6px 0 0 0; font-size: 13px;">Subscription Expiry Reminder</p>
                            </div>
                            <div style="padding: 32px 28px;">
                                <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear %s,</p>
                                <p style="margin: 0 0 16px 0; color: #334155;">This is a friendly reminder that your Zyndex <strong>%s</strong> subscription will expire in <strong>24 hours</strong> (Valid until: %s).</p>
                                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
                                    <p style="margin: 4px 0;">• We do not auto-renew or charge automatically.</p>
                                    <p style="margin: 4px 0;">• After expiry, you'll still have access to the Free Academic plan.</p>
                                    <p style="margin: 4px 0;">• To avoid interruption, you can renew anytime from your dashboard.</p>
                                </div>
                                <p style="margin: 16px 0; font-size: 13px; color: #475569;">Visit the <a href="http://localhost:5173/pricing" style="color: #d97706; font-weight: 600;">Pricing Page</a> to renew or upgrade your plan.</p>
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b;">
                                    <p style="margin: 0;">Warm regards,</p>
                                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                    """.formatted(userName, planId.replace("_", " "), String.valueOf(endDate));

            helper.setText(text, htmlBody);
            mailSender.send(mimeMessage);
            log.info("Sent 1-day plan expiry reminder email to {}", userEmail);
        } catch (Exception e) {
            log.warn("Failed to send 1-day expiry reminder email to {}: {}", userEmail, e.getMessage());
        }
    }
}

