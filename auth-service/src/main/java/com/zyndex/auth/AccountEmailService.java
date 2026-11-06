package com.zyndex.auth;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;

@Service
class AccountEmailService {
    private final JavaMailSender mailSender;
    private final AppProperties properties;

    AccountEmailService(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    void sendSignupConfirmationEmail(String name, String email, String plan, String validUntil) {
        if (properties.otpMailFrom() == null || properties.otpMailFrom().isBlank()) {
            throw new org.springframework.mail.MailSendException("SMTP email is not configured. Set OTP_SMTP_HOST, OTP_SMTP_USER, OTP_SMTP_PASS, and OTP_MAIL_FROM.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String from = properties.otpMailFrom();
            if (from != null && !from.isBlank() && !from.contains("<")) {
                helper.setFrom(from.trim(), "Zyndex Team");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(email);
            helper.setSubject("Welcome to Zyndex");
            helper.setText(signupConfirmationText(name, email, plan, validUntil), signupConfirmationHtml(name, email, plan, validUntil));
            mailSender.send(message);
            System.out.println("[ACCOUNT EMAIL] Confirmation email sent via SMTP to: " + email);
        } catch (Exception error) {
            throw new org.springframework.mail.MailSendException("Confirmation email could not be sent: " + error.getMessage(), error);
        }
    }

    void sendPlanUpgradeEmail(
            String username,
            String email,
            String previousPlan,
            String newPlan,
            Object activationDate,
            Object validUntil,
            String orderId,
            String utr,
            String paymentTime,
            String status) {
        String effectiveOrderId = (orderId != null && !orderId.isBlank()) ? orderId : "N/A";
        String effectiveUtr = (utr != null && !utr.isBlank()) ? utr : "N/A";
        String effectivePaymentTime = (paymentTime != null && !paymentTime.isBlank()) ? paymentTime : LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String effectiveStatus = (status != null && !status.isBlank()) ? status.toUpperCase() : "SUCCESS";

        send(email, "Zyndex | Plan Upgrade Confirmation", """
                Dear %s,

                Thank you for upgrading your Zyndex account.

                We're pleased to confirm that your plan has been successfully upgraded. Your new plan is now active and you can access the resources and features included with your subscription tier.

                === SUBSCRIPTION & PAYMENT DETAILS ===
                - Username: %s
                - Email Address: %s
                - Order ID: %s
                - UTR Number / Reference: %s
                - Payment Time (Exact): %s
                - Payment Status: %s
                - Previous Plan: %s
                - New Plan (Active): %s
                - Plan Activated: %s
                - Valid Until: %s

                === ACCESS YOUR ZYNDEX ACCOUNT ===
                You can sign in to your account using your registered email address:
                Email: %s

                Your upgraded plan and higher tier limits are now available on your account.

                If you did not authorize this plan upgrade or believe any of the information above is incorrect, please contact our support team immediately.

                Thank you for choosing Zyndex!

                Best regards,
                Zyndex Team
                %s
                """.formatted(
                        username, username, email, effectiveOrderId, effectiveUtr, effectivePaymentTime,
                        effectiveStatus, previousPlan, newPlan, activationDate, validUntil, email,
                        properties.otpMailFrom()));
    }

    private String signupConfirmationText(String name, String email, String plan, String validUntil) {
        return """
                Hello %s,

                Welcome to Zyndex!

                Your account has been successfully created and is now ready to use. Here are your account details:

                Account Details

                - Username: %s
                - Email Address: %s
                - Plan: %s
                - Valid Until: %s

                Zyndex Login

                You can access your Zyndex account using your registered email address:

                Email: %s

                For security, your password is not included in this email. If you haven't set your password yet, use the Reset or Forgot your password? option on the login page.

                If you did not create this account, please contact our support team immediately.

                Thank you for choosing Zyndex.

                Best regards,
                Zyndex Team
                %s
                """.formatted(name, name, email, plan, validUntil, email, properties.otpMailFrom());
    }

        private String signupConfirmationHtml(String name, String email, String plan, String validUntil) {
        return """
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033;">
                  <p>Dear %s,</p>
                  <p>Welcome to <strong>Zyndex</strong>!</p>
                                    <p>Your account has been created successfully.</p>
                                    <table style="border-collapse: collapse;">
                                        <tr><td style="padding: 5px 18px 5px 0;"><strong>Username</strong></td><td>%s</td></tr>
                                        <tr><td style="padding: 5px 18px 5px 0;"><strong>Email</strong></td><td>%s</td></tr>
                                        <tr><td style="padding: 5px 18px 5px 0;"><strong>Plan</strong></td><td>%s</td></tr>
                                        <tr><td style="padding: 5px 18px 5px 0;"><strong>Valid until</strong></td><td>%s</td></tr>
                                    </table>
                                    <p>You can now sign in to access our <strong>Educational Resource Library</strong>.</p>
                  <p>If you have any questions or need assistance, please feel free to reach out to our support team through the <strong>Contact Us</strong> page - we're always here to help.</p>
                  <p>We're excited to have you on board and wish you a rewarding and enriching learning experience with Zyndex!</p>
                  <p>Best regards,<br/><strong>Team Zyndex</strong></p>
                </div>
                """.formatted(escapeHtml(name), escapeHtml(name), escapeHtml(email), escapeHtml(plan), escapeHtml(validUntil));
    }

    void sendSubscriptionConfirmationEmail(String name, String email, String plan, double amount, int durationDays) {
        if (properties.otpMailFrom() == null || properties.otpMailFrom().isBlank()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(properties.otpMailFrom(), "Zyndex Team");
            helper.setTo(email);
            helper.setSubject("Zyndex Subscription Activated - " + plan);
            
            String text = """
                    Dear %s,

                    Thank you for your payment of INR %.2f.

                    Your Zyndex subscription plan "%s" has been successfully activated for %d days.
                    
                    Lifespan Details:
                    Plan: %s
                    Duration: %d Days
                    Amount Charged: INR %.2f
                    Status: ACTIVE
                    
                    You now have full access matching your plan tier!

                    Best regards,
                    Zyndex Team
                    """.formatted(name, amount, plan, durationDays, plan, durationDays, amount);

            String html = """
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Zyndex Payment Receipt</h2>
                      <p>Dear %s,</p>
                      <p>Thank you for subscribing to Zyndex. Your subscription plan is now active!</p>
                      <table style="width: 100%%; border-collapse: collapse; margin: 20px 0;">
                        <tr style="background-color: #f8fafc;"><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Plan Name</td><td style="padding: 10px; border: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Amount Paid</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #ea580c; font-weight: bold;">INR %.2f</td></tr>
                        <tr style="background-color: #f8fafc;"><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Lifespan / Validity</td><td style="padding: 10px; border: 1px solid #e2e8f0;">%d Days</td></tr>
                        <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Status</td><td style="padding: 10px; border: 1px solid #e2e8f0; color: #16a34a; font-weight: bold;">ACTIVE</td></tr>
                      </table>
                      <p>Access control rules are successfully applied. You can now download and view content corresponding to your plan.</p>
                      <p>Best regards,<br/><strong>Zyndex Team</strong></p>
                    </div>
                    """.formatted(escapeHtml(name), escapeHtml(plan), amount, durationDays);

            helper.setText(text, html);
            mailSender.send(message);
        } catch (Exception error) {
            System.err.println("Failed to send subscription confirmation email: " + error.getMessage());
        }
    }

    Map<String, Boolean> sendAdminRequestEmails(String fullName, String displayName, String email) {
        String dateTime = LocalDateTime.now().toString().replace('T', ' ');
        boolean adminSent = sendSafely(properties.mainAdminEmail(), "Zyndex | New Admin Access Request", """
                Dear Admin,

                A new request for Administrator Access has been submitted on Zyndex.

                Admin Request Details

                Full Name: %s
                Display Name: %s
                Email Address: %s
                Request Submitted: %s
                Request Status: Pending Review

                Action Required

                Please review this request in the Zyndex Admin Panel. For security reasons, passwords and other authentication credentials are not included in this notification email.

                Regards,

                Zyndex Security System
                %s
                """.formatted(fullName, displayName, email, dateTime, properties.otpMailFrom()));
            boolean requesterSent = sendSafely(email, "Zyndex | Admin Access Request Received", """
                Dear %s,

                Thank you for submitting your request for Administrator Access to Zyndex.

                We have successfully received your request. Your information has been forwarded to the Zyndex Administration team for review.

                Request Details

                Full Name: %s
                Display Name: %s
                Email Address: %s
                Request Submitted: %s
                Request Status: Pending Review

                You will receive a separate email once a decision has been made. Please do not submit another request unless asked.

                Best regards,
                Zyndex Administration Team
                %s
                """.formatted(fullName, fullName, displayName, email, dateTime, properties.otpMailFrom()));
            return Map.of("adminEmailSent", adminSent, "requesterEmailSent", requesterSent);
    }

    boolean sendAdminDecisionEmail(Map<String, Object> request, boolean approved, String reason) {
        String fullName = AuthSupport.str(request.get("full_name"));
        String email = AuthSupport.str(request.get("email"));
        String displayName = AuthSupport.str(request.get("display_name"));
        String dateTime = LocalDateTime.now().toString().replace('T', ' ');
        String subject = approved ? "Zyndex | Admin Access Request Approved" : "Zyndex | Admin Access Request Update";
        String text = approved ? """
                Dear %s,

                Your request for Admin Access to Zyndex has been approved.

                Full Name: %s
                Display Name: %s
                Email Address: %s
                Request Status: Approved
                Approved On: %s

                Your administrator privileges are now active. Login to Zyndex: %s

                Best regards,
                Zyndex Administration Team
                %s
                """.formatted(fullName, fullName, displayName, email, dateTime, properties.frontendUrl(), properties.otpMailFrom()) : """
                Dear %s,

                Thank you for your interest in becoming a Zyndex administrator.

                Your request for Admin Access has not been approved at this time.

                Full Name: %s
                Display Name: %s
                Email Address: %s
                Request Status: Declined
                Reviewed On: %s

                Reason for Decision:
                %s

                Best regards,
                Zyndex Administration Team
                %s
                """.formatted(fullName, fullName, displayName, email, dateTime, reason.isBlank() ? "No reason provided." : reason, properties.otpMailFrom());
        return sendSafely(email, subject, text);
    }

    boolean sendPasswordChangedEmail(String username, String email) {
        return sendSafely(email, "Zyndex | Password Changed Successfully", """
                Dear %s,

                Your Zyndex account password has been changed successfully.

                Username: %s
                Email Address: %s
                Date & Time: %s

                You can now use your new password to sign in. For your security, please do not share your password with anyone.

                If you did not make this change, contact the Zyndex Support Team at %s immediately.

                Best regards,
                Zyndex Security Team
                %s
                """.formatted(username, username, email, LocalDateTime.now().toString().replace('T', ' '), properties.mainAdminEmail(), properties.otpMailFrom()));
    }

    private boolean sendSafely(String to, String subject, String text) {
        try {
            send(to, subject, text);
            return true;
        } catch (Exception error) {
            System.err.println("[EMAIL] Delivery failed to " + to + ": " + error.getMessage());
            return false;
        }
    }

    private String wrapInZyndexBrandHtml(String preheader, String bodyContentHtml) {
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>%s</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #ea580c 0%%, #dc2626 100%%); padding: 24px 20px; text-align: center; }
                    .content-box { padding: 24px 20px; }
                    @media only screen and (max-width: 480px) {
                      body { padding: 8px 4px !important; }
                      .header-box { padding: 20px 14px !important; }
                      .content-box { padding: 18px 14px !important; }
                    }
                  </style>
                </head>
                <body>
                    <div class="email-wrapper">
                        <div class="header-box">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Zyndex</h1>
                            <p style="color: #ffedd5; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Academic Digital Library & Research Platform</p>
                        </div>
                        <div class="content-box">
                            %s
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b; margin-top: 24px;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(escapeHtml(preheader), bodyContentHtml);
    }

    private void send(String to, String subject, String text) {
        if (properties.otpMailFrom() == null || properties.otpMailFrom().isBlank()) {
            throw new org.springframework.mail.MailSendException("SMTP email is not configured.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            String from = properties.otpMailFrom();
            if (from != null && !from.isBlank() && !from.contains("<")) {
                helper.setFrom(from.trim(), "Zyndex Team");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            
            // Format text paragraphs into HTML
            StringBuilder htmlContent = new StringBuilder();
            String[] lines = text.split("\\r?\\n");
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) {
                    htmlContent.append("<div style=\"height: 10px;\"></div>");
                } else if (trimmed.startsWith("===") && trimmed.endsWith("===")) {
                    String title = trimmed.replace("=", "").trim();
                    htmlContent.append("<h3 style=\"margin: 18px 0 8px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #ea580c; letter-spacing: 0.5px;\">")
                               .append(escapeHtml(title))
                               .append("</h3>");
                } else if (trimmed.startsWith("- ")) {
                    String item = trimmed.substring(2);
                    int colonIdx = item.indexOf(":");
                    if (colonIdx > 0) {
                        String label = item.substring(0, colonIdx + 1);
                        String val = item.substring(colonIdx + 1);
                        htmlContent.append("<p style=\"margin: 4px 0; font-size: 13px; color: #334155;\"><strong>")
                                   .append(escapeHtml(label))
                                   .append("</strong>")
                                   .append(escapeHtml(val))
                                   .append("</p>");
                    } else {
                        htmlContent.append("<p style=\"margin: 4px 0; font-size: 13px; color: #334155;\">• ")
                                   .append(escapeHtml(item))
                                   .append("</p>");
                    }
                } else {
                    htmlContent.append("<p style=\"margin: 0 0 10px 0; font-size: 14px; color: #334155; line-height: 1.6;\">")
                               .append(escapeHtml(line))
                               .append("</p>");
                }
            }

            String fullHtml = wrapInZyndexBrandHtml(subject, htmlContent.toString());
            helper.setText(text, fullHtml);
            mailSender.send(message);
        } catch (Exception e) {
            // Fallback to simple mail if MimeMessage fails
            SimpleMailMessage simpleMsg = new SimpleMailMessage();
            simpleMsg.setFrom(properties.otpMailFrom());
            simpleMsg.setTo(to);
            simpleMsg.setSubject(subject);
            simpleMsg.setText(text);
            mailSender.send(simpleMsg);
        }
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
