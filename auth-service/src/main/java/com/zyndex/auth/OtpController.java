package com.zyndex.auth;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class OtpController {
    private static final long OTP_TTL_SECONDS = 300; // 5 minutes validity
    private static final SecureRandom RANDOM = new SecureRandom();
    private final Map<String, OtpRecord> otps = new ConcurrentHashMap<>();
    private final Map<String, Instant> verifiedOtps = new ConcurrentHashMap<>();
    private final JavaMailSender mailSender;
    private final AppProperties properties;
    private final AuthSupport auth;

    OtpController(JavaMailSender mailSender, AppProperties properties, AuthSupport auth) {
        this.mailSender = mailSender;
        this.properties = properties;
        this.auth = auth;
    }

    @PostMapping("/api/send-otp")
    Map<String, Object> send(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim().toLowerCase();
        String role = AuthSupport.str(body.get("role")).trim().toLowerCase();
        if (email.isBlank() || role.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and role are required.");
        }
        if (!role.equals("user") && !role.equals("admin")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role must be user or admin.");
        }

        String purpose = AuthSupport.str(body.get("purpose")).trim().toUpperCase();
        if (purpose.isBlank()) {
            purpose = AuthSupport.str(body.get("action")).trim().toUpperCase();
        }
        boolean isSignup = "SIGNUP".equals(purpose) || "REGISTER".equals(purpose) || "REGISTRATION".equals(purpose);
        boolean isPasswordReset = "PASSWORD_RESET".equals(purpose) || "RESET".equals(purpose);
        boolean isResend = "RESEND".equals(purpose) || "RESEND_OTP".equals(purpose) || Boolean.TRUE.equals(body.get("force"));
        boolean isPasswordChange = "PASSWORD_CHANGE".equals(purpose) || "CHANGE_PASSWORD".equals(purpose);

        Map<String, Object> account = auth.findUserByEmail(email);

        // Before sending OTP for signup: check if account already exists!
        if (isSignup && account != null) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email address already exists. Please sign in instead.");
        }

        // Before sending OTP for login or password reset: ensure account exists!
        if (!isSignup && account == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No account was found with this email address.");
        }

        String otp = String.valueOf(1000 + RANDOM.nextInt(9000));
        String username = AuthSupport.str(body.get("name"));
        if (username.isBlank()) {
            username = AuthSupport.str(body.get("fullName"));
        }
        if (username.isBlank()) {
            username = AuthSupport.str(body.get("displayName"));
        }
        if (username.isBlank()) {
            username = account == null ? email : AuthSupport.str(account.get("username"));
        }

        String userRoleLabel = AuthSupport.str(body.get("userType"));
        if (userRoleLabel.isBlank()) {
            userRoleLabel = role.equalsIgnoreCase("admin") ? "Administrator" : "Student / Scholar";
        }

        otps.put(key(email, role), new OtpRecord(otp, Instant.now().plusSeconds(OTP_TTL_SECONDS), 0));
        
        boolean emailDispatched = false;
        String emailError = null;

        if (properties.otpMailFrom() != null && !properties.otpMailFrom().isBlank()) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
                helper.setFrom(properties.otpMailFrom(), "Zyndex Team");
                helper.setTo(email);
                if (isSignup) {
                    helper.setSubject("Zyndex | Welcome! Verification Code for Creating Your Account");
                    helper.setText(accountCreationOtpHtml(username, email, userRoleLabel, otp), true);
                } else if (isPasswordReset) {
                    helper.setSubject("Zyndex | Password Reset Verification Code");
                    helper.setText(passwordResetOtpHtml(username, otp), true);
                } else if (isPasswordChange) {
                    helper.setSubject("Zyndex | Password Change Authorization Code");
                    helper.setText(passwordChangeOtpHtml(username, email, otp), true);
                } else if (isResend) {
                    helper.setSubject("Zyndex | Your New Replacement Verification Code (Resent OTP)");
                    helper.setText(resendOtpHtml(username, otp), true);
                } else {
                    helper.setSubject("Zyndex | Your Login Authentication Verification Code");
                    helper.setText(loginOtpHtml(username, otp), true);
                }
                mailSender.send(mimeMessage);
                emailDispatched = true;
                System.out.println("[OTP LOG] HTML Email successfully sent via SMTP to: " + email + " (purpose=" + purpose + ")");
            } catch (Exception error) {
                System.err.println("[OTP LOG] SMTP delivery failed: " + error.getMessage());
                emailError = error.getMessage();
            }
        }

        // If email was dispatched successfully
        if (emailDispatched) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "OTP sent successfully to " + email);
            resp.put("expiresInSeconds", OTP_TTL_SECONDS);
            resp.put("emailSent", true);
            if (properties.exposeOtpInDevelopment()) {
                System.out.println("[OTP LOG] Generated OTP for email=" + email + ", role=" + role + " -> " + otp);
                resp.put("otp", otp);
            }
            return resp;
        }

        // Fallback for development mode if email sending failed or email is not configured
        if (properties.exposeOtpInDevelopment()) {
            System.out.println("[OTP LOG] Generated OTP for email=" + email + ", role=" + role + " -> " + otp + " (Email dispatch skipped or failed: " + emailError + ")");
            return Map.of(
                    "message", "OTP generated (Development Mode).",
                    "expiresInSeconds", OTP_TTL_SECONDS,
                    "emailSent", false,
                    "otp", otp);
        }

        if (emailError != null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to send verification OTP via email: " + emailError);
        }

        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to send verification OTP. Please check email/SMTP configuration.");
    }

    @PostMapping("/api/verify-otp")
    Map<String, Object> verify(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim().toLowerCase();
        String otp = AuthSupport.str(body.get("otp")).trim();
        String role = AuthSupport.str(body.get("role")).trim().toLowerCase();
        if (email.isBlank() || otp.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and OTP are required.");
        }
        if (!otp.matches("^\\d{4}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP must be a 4-digit code.");
        }
        String recordKey = role.isBlank() ? findKey(email) : key(email, role);
        OtpRecord record = recordKey == null ? null : otps.get(recordKey);
        if (record == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "OTP not found. Please request a new OTP.");
        }
        if (Instant.now().isAfter(record.expiresAt)) {
            otps.remove(recordKey);
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP has expired. Please request a new OTP.");
        }
        if (record.attempts >= 5) {
            otps.remove(recordKey);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect attempts. Please request a new OTP.");
        }
        if (!record.otp.equals(otp)) {
            record.attempts += 1;
            if (record.attempts >= 5) {
                otps.remove(recordKey);
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect attempts. Please request a new OTP.");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid OTP.");
        }
        otps.remove(recordKey);
        verifiedOtps.put(recordKey, Instant.now().plusSeconds(OTP_TTL_SECONDS));
        return Map.of("message", "OTP verified successfully.");
    }

    boolean consumeVerifiedOtp(String email, String role) {
        String recordKey = key(email, role);
        Instant verifiedUntil = verifiedOtps.remove(recordKey);
        return verifiedUntil != null && Instant.now().isBefore(verifiedUntil);
    }

    private String findKey(String email) {
        if (otps.containsKey(key(email, "user"))) {
            return key(email, "user");
        }
        if (otps.containsKey(key(email, "admin"))) {
            return key(email, "admin");
        }
        return null;
    }

    private String key(String email, String role) {
        return role + ":" + email;
    }

    private String otpDisplayBoxHtml(String label, String otp, String borderHex, String bgHex, String textHex, String subtextHex) {
        return """
                <div style="background-color: %s; border: 2px dashed %s; border-radius: 12px; padding: 22px 18px 16px 18px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: %s; display: block; margin-bottom: 8px;">%s</span>
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 6px auto 10px auto;">
                        <tr>
                            <td align="center" style="background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px 18px;">
                                <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: %s; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace, sans-serif; display: inline-block; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; user-select: all; cursor: text;">%s</span>
                            </td>
                        </tr>
                    </table>
                    <p style="font-size: 11px; color: %s; margin: 6px 0 0 0; line-height: 1.4;">
                        Select or double-click to copy · Valid for 2 minutes · Single-use code
                    </p>
                </div>
                """.formatted(bgHex, borderHex, subtextHex, label, textHex, otp, subtextHex);
    }

    private String accountCreationOtpHtml(String username, String email, String role, String otp) {
        String formattedTimestamp = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata"))
                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)"));
        String otpBox = otpDisplayBoxHtml("Your Account Creation OTP", otp, "#f97316", "#fff7ed", "#ea580c", "#c2410c");
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Welcome to Zyndex</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #ea580c 0%%, #dc2626 100%%); padding: 24px 20px; text-align: center; }
                    .content-box { padding: 24px 20px; }
                    .details-table td { padding: 5px 0; font-size: 13px; word-break: break-word; }
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
                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear %s,</p>
                            <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">
                                Thanks for choosing our platform! We are excited to welcome you to <b>Zyndex</b>. To complete your account registration and verify your ownership of this email address, please use the One-Time Password (OTP) provided below:
                            </p>
                            
                            %s

                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
                                <h3 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Registration Details</h3>
                                <table class="details-table" style="width: 100%%; font-size: 13px; color: #334155; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; width: 38%%; color: #64748b;">Full Name:</td>
                                        <td style="padding: 5px 0; font-weight: 500;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #64748b;">Email Address:</td>
                                        <td style="padding: 5px 0; font-family: monospace;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #64748b;">Account Role:</td>
                                        <td style="padding: 5px 0;"><span style="background-color: #ffedd5; color: #c2410c; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; display: inline-block;">%s</span></td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 5px 0; font-weight: 600; color: #64748b;">Timestamp:</td>
                                        <td style="padding: 5px 0; font-family: monospace; font-size: 12px;">%s</td>
                                    </tr>
                                </table>
                            </div>

                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #0f172a;">Security & Verification Advisory:</p>
                            <p style="margin: 0 0 14px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                                If you did not initiate this account creation or did not request any verification code on Zyndex, someone may have entered your email address by mistake. Please check your Google account activity or simply ignore and discard this email. No account will be activated or created without submitting this OTP.
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                                For your security, our team and representatives will never contact you to ask for this code or your password.
                            </p>

                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, otpBox, username, email, role, formattedTimestamp);
    }

    private String loginOtpHtml(String username, String otp) {
        String formattedTimestamp = DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)")
                .withZone(ZoneId.of("Asia/Kolkata"))
                .format(Instant.now());
        String otpBox = otpDisplayBoxHtml("Your Sign-In OTP", otp, "#f97316", "#fff7ed", "#ea580c", "#c2410c");
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Zyndex Login Verification</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #f97316 0%%, #ea580c 100%%); padding: 24px 20px; text-align: center; }
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
                            <p style="color: #ffedd5; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Secure Login Authentication</p>
                        </div>
                        <div class="content-box">
                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Hello %s,</p>
                            <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">
                                We received a request to authenticate your login session on <b>Zyndex</b>. Please use the One-Time Password (OTP) below to complete your 2-step verification:
                            </p>
                            %s
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b; word-break: break-word;">
                                <b>Authentication Timestamp:</b> %s
                            </div>
                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #0f172a;">Security Advisory:</p>
                            <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
                                <li>Do not share this OTP with anyone under any circumstances.</li>
                                <li>Zyndex administrators and support representatives will never contact you requesting this code.</li>
                                <li>If you did not initiate this login request, please check your Google account activity immediately or change your password.</li>
                            </ul>
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, otpBox, formattedTimestamp);
    }

    private String passwordResetOtpHtml(String username, String otp) {
        String formattedTimestamp = DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)")
                .withZone(ZoneId.of("Asia/Kolkata"))
                .format(Instant.now());
        String otpBox = otpDisplayBoxHtml("Password Reset OTP", otp, "#ef4444", "#fef2f2", "#dc2626", "#991b1b");
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Zyndex Password Reset Verification</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%); padding: 24px 20px; text-align: center; }
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
                            <p style="color: #fee2e2; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Password Reset Security Verification</p>
                        </div>
                        <div class="content-box">
                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear %s,</p>
                            <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">
                                We received a formal request to reset the password for your <b>Zyndex</b> account. To confirm your identity and proceed with setting a new password, enter the verification code below:
                            </p>
                            %s
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b; word-break: break-word;">
                                <b>Request Timestamp:</b> %s
                            </div>
                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #0f172a;">Critical Security Notice:</p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6; word-break: break-word;">
                                If you did not request a password reset, your credentials may be safe but we recommend checking your Google account activity or reaching out to support at <a href="mailto:%s" style="color: #ef4444;">%s</a>. Your password will remain unchanged without this OTP.
                            </p>
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, otpBox, formattedTimestamp, properties.mainAdminEmail(), properties.mainAdminEmail());
    }

    private String passwordChangeOtpHtml(String username, String email, String otp) {
        String formattedTimestamp = DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)")
                .withZone(ZoneId.of("Asia/Kolkata"))
                .format(Instant.now());
        String otpBox = otpDisplayBoxHtml("Password Change Authorization OTP", otp, "#7c3aed", "#f5f3ff", "#6d28d9", "#5b21b6");
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Zyndex Password Change Verification</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #7c3aed 0%%, #6d28d9 100%%); padding: 24px 20px; text-align: center; }
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
                            <p style="color: #ede9fe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Password Modification Security Check</p>
                        </div>
                        <div class="content-box">
                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Dear %s,</p>
                            <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6; word-break: break-word;">
                                An in-session request was made to update the password for your account (<b>%s</b>). To authorize this change, please submit the authorization code below:
                            </p>
                            %s
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b; word-break: break-word;">
                                <b>Action Timestamp:</b> %s
                            </div>
                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #0f172a;">Security Advisory:</p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                                If you did not make this change request from your profile settings, please immediately sign out of all devices and contact our security administration.
                            </p>
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, email, otpBox, formattedTimestamp);
    }

    private String resendOtpHtml(String username, String otp) {
        String formattedTimestamp = DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)")
                .withZone(ZoneId.of("Asia/Kolkata"))
                .format(Instant.now());
        String otpBox = otpDisplayBoxHtml("Your New Replacement OTP", otp, "#0284c7", "#f0f9ff", "#0284c7", "#0369a1");
        return """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Zyndex Replacement Verification Code</title>
                  <style>
                    body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
                    .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                    .header-box { background: linear-gradient(135deg, #0284c7 0%%, #0369a1 100%%); padding: 24px 20px; text-align: center; }
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
                            <p style="color: #e0f2fe; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Replacement Verification Code</p>
                        </div>
                        <div class="content-box">
                            <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Hello %s,</p>
                            <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">
                                As requested, we have invalidated your previous OTP and generated a brand-new replacement code. Please use this fresh code to complete your verification:
                            </p>
                            %s
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin: 20px 0; font-size: 12px; color: #64748b; word-break: break-word;">
                                <b>Generated At:</b> %s
                            </div>
                            <p style="margin: 20px 0 8px 0; font-size: 13px; font-weight: 600; color: #0f172a;">Reminder:</p>
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                                If you did not click "Resend OTP" or did not request a new code, please check your Google account activity or contact us.
                            </p>
                            <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                <p style="margin: 0;">Best regards,</p>
                                <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(username, otpBox, formattedTimestamp);
    }


    private static class OtpRecord {
        final String otp;
        final Instant expiresAt;
        int attempts;

        OtpRecord(String otp, Instant expiresAt, int attempts) {
            this.otp = otp;
            this.expiresAt = expiresAt;
            this.attempts = attempts;
        }
    }
}
