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
        String createdTimestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        return """
                Hello %s,

                Welcome to Zyndex!

                Your academic account has been created and verified successfully.

                === ACCOUNT DETAILS ===
                - Full Name: %s
                - Registered Email: %s
                - Account Creation Time: %s
                - Active Plan: %s
                - Plan Validity: %s

                === KEY PLATFORM FEATURES ===
                - Instant Academic Search: Discover textbooks, journals, syllabus notes, and lecture slides.
                - Real-Time Reading Telemetry: Accurate reading time tracking with active tab detection.
                - High-Performance PDF Preview: Responsive inline reader with continuous zoom, pagination, and outline.
                - Secure Multi-Factor Authentication: Dynamic numeric OTP and trusted device security.
                - Multi-Tier Membership: Tailored tiers from Free Evaluator to Researcher Pro with elevated quota.

                === ACADEMIC DISCIPLINES & CATEGORIES ===
                - AI (Artificial Intelligence)
                - ML (Machine Learning)
                - Computer Science
                - Physics
                - Chemistry
                - Mathematics
                - Economics
                - History
                - Literature
                - Biology

                You can sign in to your Zyndex account anytime using:
                Login URL: /Zyndex/User/Log-In
                Email: %s

                For assistance, reach out to our team via the Help Center or Contact page.

                Best regards,
                Zyndex Team
                %s
                """.formatted(name, name, email, createdTimestamp, plan, validUntil, email, properties.otpMailFrom());
    }

            private String signupConfirmationHtml(String name, String email, String plan, String validUntil) {
        String createdTimestamp = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        String body = """
                <div style="font-size: 15px; color: #1e293b; line-height: 1.6;">
                    <p style="margin-top: 0;">Dear <strong>%s</strong>,</p>
                    <p>Welcome to <strong>Zyndex</strong> — your premier academic digital library and research discovery platform.</p>
                    <p>Your student/scholar account has been verified and provisioned successfully. Below are your account and plan credentials:</p>
                    
                    <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #ea580c;">Account &amp; Plan Summary</h3>
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr><td style="padding: 6px 0; color: #64748b; width: 40%%;">Full Name</td><td style="padding: 6px 0; font-weight: 700; color: #0f172a;">%s</td></tr>
                            <tr><td style="padding: 6px 0; color: #64748b;">Registered Email</td><td style="padding: 6px 0; font-weight: 700; color: #0f172a;">%s</td></tr>
                            <tr><td style="padding: 6px 0; color: #64748b;">Account Created</td><td style="padding: 6px 0; font-weight: 600; color: #334155;">%s</td></tr>
                            <tr><td style="padding: 6px 0; color: #64748b;">Subscription Plan</td><td style="padding: 6px 0; font-weight: 800; color: #ea580c;">%s</td></tr>
                            <tr><td style="padding: 6px 0; color: #64748b;">Plan Validity</td><td style="padding: 6px 0; font-weight: 600; color: #16a34a;">%s</td></tr>
                        </table>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">Platform Highlights &amp; Features</h3>
                        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.65;">
                            <li><strong>Smart Resource Discovery:</strong> Real-time filtering across thousands of textbooks, lecture slides, and research notes.</li>
                            <li><strong>Live Reading Telemetry:</strong> Automatic logging of genuine reading minutes with smart tab visibility detection.</li>
                            <li><strong>High-Performance PDF Viewer:</strong> Smooth in-browser previews with outline navigation and zoom controls.</li>
                            <li><strong>Personal Library:</strong> Bookmark favorites and resume reading right where you left off.</li>
                            <li><strong>Enhanced Security:</strong> 256-bit encryption, dynamic OTP authentication, and 24-hour trusted device support.</li>
                        </ul>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">Available Academic Categories (10 Disciplines)</h3>
                        <div style="font-size: 12px; color: #475569; margin-top: 6px; line-height: 2.2;">
                            <span style="background-color: #ffedd5; color: #c2410c; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">AI</span>
                            <span style="background-color: #fee2e2; color: #b91c1c; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">ML</span>
                            <span style="background-color: #dbeafe; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Computer Science</span>
                            <span style="background-color: #cffafe; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Physics</span>
                            <span style="background-color: #ffe4e6; color: #be123c; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Chemistry</span>
                            <span style="background-color: #f3e8ff; color: #7e22ce; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Mathematics</span>
                            <span style="background-color: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Economics</span>
                            <span style="background-color: #fef08a; color: #854d0e; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">History</span>
                            <span style="background-color: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Literature</span>
                            <span style="background-color: #d1fae5; color: #047857; padding: 4px 10px; border-radius: 6px; font-weight: 600; margin-right: 6px; display: inline-block;">Biology</span>
                        </div>
                    </div>

                    <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
                        If you have any questions or require research assistance, please reach out via our Help Center.
                    </p>
                </div>
                """.formatted(escapeHtml(name), escapeHtml(name), escapeHtml(email), escapeHtml(createdTimestamp), escapeHtml(plan), escapeHtml(validUntil));

        return wrapInZyndexBrandHtml("Welcome to Zyndex - Your Academic Account is Ready", body);
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

    boolean sendMaintenanceScheduledEmail(String name, String email) {
        return sendSafely(email, "Notice: Scheduled Platform Maintenance in 15 Minutes - Zyndex", """
                Dear %s,

                We would like to notify you that the Zyndex Digital Library platform is scheduled to undergo necessary system maintenance and technical upgrades starting in 15 minutes.

                Maintenance Details:
                - Platform: Zyndex Digital Library & Resource Hub
                - Window: Starting in approximately 15 minutes
                - Impact: Active reading sessions, resource downloads, and admin features will be temporarily unavailable.

                Please save any in-progress reading sessions and work immediately. All your account records, reading histories, and active subscriptions remain completely safe and preserved.

                We apologize for any temporary inconvenience and appreciate your patience while we optimize our services.

                Warm regards,
                The Zyndex Systems Team
                %s
                """.formatted(name, properties.otpMailFrom()));
    }

    boolean sendMaintenanceActiveEmail(String name, String email) {
        return sendSafely(email, "Zyndex Platform Under Maintenance - Service Temporarily Offline", """
                Dear %s,

                The Zyndex platform is now officially undergoing scheduled maintenance.

                During this maintenance period:
                - Active user and administrative sessions have been safely suspended.
                - Public informational pages (About, Pricing, Terms, Privacy) remain accessible.
                - Logins, account registration, password resets, and catalog modifications are temporarily disabled.

                Our engineering team is actively performing system enhancements to bring you higher performance and reliability. We will dispatch an automated confirmation email as soon as the platform is fully back online.

                Thank you for your cooperation and understanding.

                Sincerely,
                Zyndex Technical Operations
                %s
                """.formatted(name, properties.otpMailFrom()));
    }

    boolean sendMaintenanceCancelledEmail(String name, String email) {
        return sendSafely(email, "Notice: Scheduled Maintenance Postponed / Cancelled - Normal Access Restored", """
                Dear %s,

                Please be advised that the previously scheduled platform maintenance has been postponed and cancelled due to technical scheduling adjustments.

                What this means for you:
                - The Zyndex digital library and all microservices remain 100%% ONLINE and fully operational.
                - The scheduled maintenance timer has been disabled immediately.
                - You can continue your academic reading, research, and platform operations without any interruption or session suspension.
                - When the maintenance window is rescheduled in the future, advance notice will be provided.

                Support Contact: %s

                We apologize for any confusion caused by the initial notice and thank you for your understanding.

                Warm regards,
                The Zyndex Systems Team
                %s
                """.formatted(name, properties.mainAdminEmail(), properties.otpMailFrom()));
    }

    boolean sendMaintenanceConcludedEmail(String name, String email) {
        return sendSafely(email, "Good News! Zyndex is Back Online - Normal Access Restored", """
                Dear %s,

                We are pleased to inform you that the platform maintenance has concluded successfully, and all Zyndex systems, microservices, and digital library catalogs are now 100%% operational!

                You can now sign in to your Zyndex account and resume accessing your academic books, journals, documents, and research materials seamlessly.

                Support Contact: %s

                Thank you for your patience and support!

                Best regards,
                The Zyndex Team
                %s
                """.formatted(name, properties.mainAdminEmail(), properties.otpMailFrom()));
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

    boolean sendRoleChangedEmail(String username, String email, String oldRole, String newRole, String changedByAdminName, String changedAt) {
        String subject = "Zyndex | Platform Role Update: " + newRole;
        String text = """
                Dear %s,

                Your platform access role on Zyndex has been updated by the primary platform administration.

                === ROLE UPDATE DETAILS ===
                - Account Name: %s
                - Registered Email: %s
                - Previous Role: %s
                - New Platform Role: %s
                - Updated By: %s (Main Administrator)
                - Timestamp: %s

                === WHAT THIS MEANS & PERMISSIONS ===
                %s

                If you have questions regarding your updated access permissions or require assistance, please contact the primary administrator at %s.

                Best regards,
                Zyndex Platform Security & Administration
                %s
                """.formatted(
                username,
                username,
                email,
                oldRole,
                newRole,
                changedByAdminName,
                changedAt,
                "ADMIN".equalsIgnoreCase(newRole)
                    ? """
                      - Full access to the Admin Console, Resource Management, and Telemetry Logs.
                      - Capability to upload and manage academic resources with unlimited storage.
                      - Real-time review and response management for learner feedback.
                      - Note: Elevation to Main Admin privileges and modifying other administrators' roles remains exclusively reserved for the primary administrator.
                      """.trim()
                    : """
                      - Standard learner/reader access to curated academic textbooks, guides, and articles.
                      - Personalized study dashboard, reading history, bookmarks, and resource rating privileges.
                      - Administrative console permissions have been gracefully revoked.
                      """.trim(),
                properties.mainAdminEmail(),
                properties.otpMailFrom()
        );

        try {
            send(email, subject, text);
            System.out.println("[ACCOUNT EMAIL] Role change notification delivered to: " + email);
            return true;
        } catch (Exception e) {
            System.err.println("[ACCOUNT EMAIL] Failed to deliver role change notification to " + email + ": " + e.getMessage());
            return false;
        }
    }

    boolean sendAccountDeletionSuccessEmail(String username, String email, String role, String reasons, String comments, String timestamp) {
        String subject = "Zyndex | Account Successfully Deleted - We're Sorry to See You Go";
        String reasonsSummary = (reasons == null || reasons.isBlank()) ? "No specific feedback provided" : reasons;
        String commentsSummary = (comments == null || comments.isBlank()) ? "None provided" : comments;

        // 1. Email to the departing user
        String userText = """
                Dear %s,

                Your Zyndex account (%s) has been permanently deleted as requested. We are truly sorry to lose an amazing scholar and member of our academic community.

                === DELETION & FEEDBACK SUMMARY ===
                - Account Name: %s
                - Account Email: %s
                - Role Type: %s
                - Deletion Timestamp: %s
                - Reasons Stated: %s
                - Additional Notes / Feedback: %s

                === WHAT HAS HAPPENED TO YOUR DATA ===
                In compliance with academic privacy and data protection standards:
                - Your profile credentials and passwords have been permanently deleted from our active database.
                - All active authentication sessions across your devices have been permanently invalidated.
                - Personal reading preferences and bookmarks have been purged.

                We appreciate every moment you spent learning, researching, and contributing to Zyndex. If your academic needs ever change, or if you wish to return in the future, our doors will always remain open for you.

                If this deletion was unintended or unauthorized, please contact our principal administrator immediately at %s.

                Warm regards and best wishes for your academic journey,
                The Zyndex Team
                %s
                """.formatted(
                username,
                email,
                username,
                email,
                role,
                timestamp,
                reasonsSummary,
                commentsSummary,
                properties.mainAdminEmail(),
                properties.otpMailFrom()
        );

        // 2. Comprehensive notification email to the Platform Owner (Bhaanugali)
        String adminText = """
                Attention: Bhaanu Gali (Zyndex Platform Administrator),

                A user or administrator account has just been permanently deleted by self-service verification on Zyndex.

                === ACCOUNT DELETION AUDIT RECORD ===
                - Full Name: %s
                - Email Address: %s
                - Previous Platform Role: %s
                - Exact Timestamp: %s
                - Stated Reason(s) for Deletion: %s
                - Additional User Comment / Feedback: %s

                === SYSTEM ACTION PERFORMED ===
                - Verification Method: 4-digit security OTP + explicit 'CONFIRM' text challenge.
                - Database Action: User row purged from 'users' table.
                - Session Status: All JWT and device sessions terminated.
                - Farewell email dispatched to %s.

                This audit notification has been logged automatically by auth-service.

                Zyndex Platform Audit Engine
                """.formatted(
                username,
                email,
                role,
                timestamp,
                reasonsSummary,
                commentsSummary,
                email
        );

        try {
            send(email, subject, userText);
            System.out.println("[ACCOUNT EMAIL] Farewell deletion email delivered to user: " + email);
        } catch (Exception e) {
            System.err.println("[ACCOUNT EMAIL] Failed to deliver farewell email to user: " + e.getMessage());
        }

        try {
            send(properties.mainAdminEmail(), "Zyndex Audit | Account Deleted: " + username + " (" + email + ")", adminText);
            System.out.println("[ACCOUNT EMAIL] Deletion audit notification sent to main admin: " + properties.mainAdminEmail());
        } catch (Exception e) {
            System.err.println("[ACCOUNT EMAIL] Failed to deliver deletion audit to admin: " + e.getMessage());
        }

        return true;
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
