package com.zyndex.content;

import java.time.LocalDateTime;
import java.util.Map;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
class ContactEmailService {
    private final JavaMailSender mailSender;
    private final AppProperties properties;

    ContactEmailService(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
    }

    Map<String, Boolean> sendContactEmails(String name, String email, String subject, String message) {
        String dateTime = LocalDateTime.now().toString().replace('T', ' ');
        boolean adminSent = sendSafely(properties.mainAdminEmail(), "Zyndex | New Contact Enquiry from " + name, """
                Dear Zyndex Team,

                You have received a new enquiry through the Zyndex website.

                === ENQUIRY DETAILS ===
                - Name: %s
                - Email Address: %s
                - Subject: %s

                === MESSAGE ===
                %s

                Received On: %s

                You can reply directly to %s to respond to this enquiry.

                Regards,
                Zyndex Website
                """.formatted(name, email, subject, message, dateTime, email));
            boolean requesterSent = sendSafely(email, "Zyndex | We've Received Your Enquiry", """
                Dear %s,

                Thank you for contacting Zyndex.

                We have successfully received your enquiry and our team will review your message. We will get back to you as soon as possible.

                === ENQUIRY DETAILS ===
                - Subject: %s

                === MESSAGE ===
                %s

                Submitted On: %s

                If you need to provide additional information, you can reply directly to this email.

                Best regards,
                Zyndex Team
                %s
                """.formatted(name, subject, message, dateTime, properties.otpMailFrom()));
            return Map.of("adminEmailSent", adminSent, "requesterEmailSent", requesterSent);
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
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "SMTP email is not configured.");
        }
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            String from = properties.otpMailFrom();
            if (from != null && !from.isBlank() && !from.contains("<")) {
                helper.setFrom(from.trim(), "Zyndex Team");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);

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
            mailSender.send(mimeMessage);
        } catch (Exception e) {
            SimpleMailMessage mail = new SimpleMailMessage();
            String from = properties.otpMailFrom();
            if (from != null && !from.isBlank() && !from.contains("<")) {
                mail.setFrom("Zyndex Team <" + from.trim() + ">");
            } else {
                mail.setFrom(from);
            }
            mail.setTo(to);
            mail.setSubject(subject);
            mail.setText(text);
            mailSender.send(mail);
        }
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("\"", "&quot;")
                    .replace("'", "&#39;");
    }

    private boolean sendSafely(String to, String subject, String text) {
        try {
            send(to, subject, text);
            return true;
        } catch (Exception error) {
            System.err.println("[CONTACT EMAIL] Delivery failed to " + to + ": " + error.getMessage());
            return false;
        }
    }
}