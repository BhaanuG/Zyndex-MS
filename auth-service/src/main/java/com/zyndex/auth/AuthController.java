package com.zyndex.auth;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
class AuthController {
    private final JdbcTemplate jdbc;
    private final AuthSupport auth;
    private final AccountEmailService accountEmailService;
    private final OtpController otpController;

    AuthController(JdbcTemplate jdbc, AuthSupport auth, AccountEmailService accountEmailService, OtpController otpController) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.accountEmailService = accountEmailService;
        this.otpController = otpController;
    }

    @PostMapping("/register")
    Map<String, Object> register(@RequestBody Map<String, Object> body) {
        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String password = AuthSupport.str(body.get("password"));
        String userType = AuthSupport.str(body.get("userType"));
        String profession = AuthSupport.str(body.get("profession"));
        String collegeName = AuthSupport.str(body.get("collegeName"));
        String universityName = AuthSupport.str(body.get("universityName"));

        if (name.isBlank() || email.isBlank() || password.isBlank() || userType.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name, email, password, and user type are required.");
        }
        if ("Other".equalsIgnoreCase(userType) && profession.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter your profession.");
        }
        if (!AuthSupport.isValidEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter a valid email address.");
        }
        auth.validatePasswordStrength(password);
        if (auth.findUserByEmail(email) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        // Verify that OTP verification was completed before creating the new user account
        if (!otpController.consumeVerifiedOtp(email.toLowerCase(), "user")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email OTP verification is required to create a new account.");
        }

        jdbc.update("INSERT INTO users (created_at, email, password, username, role, user_type, profession, college_name, university_name) VALUES (NOW(), ?, ?, ?, 'STUDENT', ?, ?, ?, ?)",
                email, auth.passwordEncoder.encode(password), name, userType, profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName);
        Map<String, Object> user = auth.sanitizeUser(auth.findUserByEmail(email));
        try {
            accountEmailService.sendSignupConfirmationEmail(name, email, "Free / Demo", "No expiry");
            return Map.of(
                    "message", "Account created successfully. Confirmation email sent.",
                    "user", user,
                    "confirmationEmailSent", true,
                    "confirmationEmailError", "");
        } catch (MailException | ApiException error) {
            return Map.of(
                    "message", "Account created successfully, but confirmation email could not be sent.",
                    "user", user,
                    "confirmationEmailSent", false,
                    "confirmationEmailError", error.getMessage() == null ? "Confirmation email could not be sent." : error.getMessage());
        }
    }

    @PostMapping("/login")
    Map<String, Object> login(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email"));
        String password = AuthSupport.str(body.get("password"));
        String role = AuthSupport.str(body.get("role"));
        boolean preview = Boolean.TRUE.equals(body.get("preview"));
        if (email.isBlank() || password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and password are required.");
        }
        if (preview && !AuthSupport.isValidEmail(email)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Entered wrong email.");
        }
        Map<String, Object> dbUser = auth.findUserByEmail(email);
        if (dbUser == null) {
            String roleSpecificNotFound = "admin".equalsIgnoreCase(role)
                    ? "This email is not registered as an administrator. Please check your credentials or request admin access."
                    : "This email is not registered for user access. Please create an account or verify your email.";
            throw new ApiException(HttpStatus.NOT_FOUND, roleSpecificNotFound);
        }

        Map<String, Object> user = auth.sanitizeUser(dbUser);

        // Check if the role matches before checking password or throwing generic errors
        if (!role.isBlank() && !role.equalsIgnoreCase(String.valueOf(user.get("role")))) {
            String roleMismatchMsg = "admin".equalsIgnoreCase(String.valueOf(user.get("role")))
                    ? "This email is registered with administrator privileges. Please switch to the Admin Log In portal to continue."
                    : "This email is registered as a user/student account. Please switch to the User Log In portal to access your account.";
            throw new ApiException(HttpStatus.FORBIDDEN, roleMismatchMsg);
        }

        if (!auth.passwordEncoder.matches(password, AuthSupport.str(dbUser.get("password")))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Entered wrong password. Please try again or reset your password.");
        }

        // Check if user account has been terminated by administrator
        if (Boolean.TRUE.equals(user.get("terminated"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The given email ID has been terminated by an administrator. Please contact administrator.");
        }

        // Check maintenance mode: only Main Admin can log in during maintenance mode
        if (auth.isMaintenanceMode() && !Boolean.TRUE.equals(user.get("isPrimaryAdmin"))) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The platform is currently under scheduled maintenance mode. Kindly check back later or contact the main administrator. We apologize for the inconvenience.");
        }

        if (preview) {
            return Map.of("message", "Credentials verified.", "user", user);
        }

        String clientProvidedIp = AuthSupport.str(body.get("clientIp"));
        String clientIp = AuthSupport.getClientIp(request, clientProvidedIp);
        try {
            // Increment session_token_version to invalidate any previous active sessions on other devices
            jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, session_invalidation_reason = 'SUPERSEDED_BY_NEW_LOGIN', last_active_at = NOW() WHERE id = ?", user.get("id"));
            // Fetch updated version to stamp on new JWT
            Map<String, Object> updatedUser = auth.findUserById(AuthSupport.number(user.get("id")));
            if (updatedUser != null) {
                user = auth.sanitizeUser(updatedUser);
            }

            // If device info provided in login request, record/update device session in trusted_devices table
            String deviceToken = AuthSupport.str(body.get("deviceToken")).trim();
            if (!deviceToken.isBlank()) {
                String deviceName = AuthSupport.str(body.get("deviceName")).trim();
                String browser = AuthSupport.str(body.get("browser")).trim();
                String os = AuthSupport.str(body.get("os")).trim();
                boolean isTrusted = Boolean.TRUE.equals(body.get("isTrusted"));

                // Device trust expiry: if explicitly trusted, until midnight IST; otherwise keep active device session for 30 days
                java.time.Instant expiryInstant = isTrusted
                        ? java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).toLocalDate().plusDays(1).atStartOfDay(java.time.ZoneId.of("Asia/Kolkata")).toInstant()
                        : java.time.Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS);

                jdbc.update("DELETE FROM trusted_devices WHERE LOWER(email) = LOWER(?) AND device_token = ?", email, deviceToken);
                jdbc.update("""
                        INSERT INTO trusted_devices (user_id, email, device_token, device_name, browser, operating_system, ip_address, trusted_at, expires_at, is_trusted)
                        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                        """,
                        user.get("id"), email, deviceToken,
                        deviceName.isBlank() ? "Web Browser" : deviceName,
                        browser.isBlank() ? "Browser" : browser,
                        os.isBlank() ? "Desktop/Mobile" : os,
                        clientIp,
                        java.sql.Timestamp.from(expiryInstant),
                        isTrusted
                );
            }

            jdbc.update(
                "INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status) " +
                "VALUES (NOW(), 'AUTH-SERVICE', 'INFO', 'USER_LOGIN', ?, 'User successfully logged in and session token issued.', ?, 'SUCCESS')",
                user.get("email"), clientIp
            );
        } catch (Exception ignored) {}
        return Map.of("token", auth.signToken(user), "user", user);
    }

    @PostMapping("/check-login")
    Map<String, Object> checkLogin(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        body.put("preview", true);
        return login(request, body);
    }

    @PostMapping("/check-status")
    Map<String, Object> checkStatus(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim();
        if (email.isBlank()) {
            return Map.of("exists", false, "terminated", false);
        }
        Map<String, Object> dbUser = auth.findUserByEmail(email);
        if (dbUser == null) {
            return Map.of("exists", false, "terminated", false);
        }
        boolean isTerminated = AuthSupport.bool(dbUser.get("is_terminated"));
        return Map.of(
            "exists", true,
            "terminated", isTerminated,
            "message", isTerminated ? "The given email ID has been terminated by an administrator. Please contact administrator." : "Active"
        );
    }

    @PostMapping("/check-trusted-device")
    Map<String, Object> checkTrustedDevice(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim().toLowerCase();
        String deviceToken = AuthSupport.str(body.get("deviceToken")).trim();

        if (email.isBlank() || deviceToken.isBlank()) {
            return Map.of("trusted", false);
        }

        // Check if device is trusted, marked as is_trusted = true, and not expired
        // Note: expires_at is stored in UTC via JDBC driver, so compare against UTC_TIMESTAMP() to ensure exact midnight IST alignment
        var rows = jdbc.queryForList(
                "SELECT id, expires_at FROM trusted_devices WHERE LOWER(email) = LOWER(?) AND device_token = ? AND is_trusted = TRUE AND (expires_at > UTC_TIMESTAMP() OR expires_at > NOW()) LIMIT 1",
                email, deviceToken
        );

        boolean isTrusted = !rows.isEmpty();
        return Map.of("trusted", isTrusted);
    }

    @PostMapping("/trust-device")
    Map<String, Object> trustDevice(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim().toLowerCase();
        String deviceToken = AuthSupport.str(body.get("deviceToken")).trim();
        String deviceName = AuthSupport.str(body.get("deviceName")).trim();
        String browser = AuthSupport.str(body.get("browser")).trim();
        String os = AuthSupport.str(body.get("os")).trim();
        boolean isTrusted = body.get("isTrusted") == null || Boolean.TRUE.equals(body.get("isTrusted"));

        if (email.isBlank() || deviceToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and deviceToken are required.");
        }

        Map<String, Object> user = auth.findUserByEmail(email);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }
        long userId = AuthSupport.number(user.get("id"));

        // Delete any existing device record for this token & email
        jdbc.update("DELETE FROM trusted_devices WHERE LOWER(email) = LOWER(?) AND device_token = ?", email, deviceToken);

        String clientProvidedIp = AuthSupport.str(body.get("clientIp"));
        String clientIp = AuthSupport.getClientIp(request, clientProvidedIp);

        java.time.Instant expiryInstant;
        if (isTrusted) {
            // Calculate midnight IST (12:00 AM IST of the following day)
            java.time.ZoneId istZone = java.time.ZoneId.of("Asia/Kolkata");
            java.time.ZonedDateTime nowIst = java.time.ZonedDateTime.now(istZone);
            java.time.ZonedDateTime midnightNextIst = nowIst.toLocalDate().plusDays(1).atStartOfDay(istZone);
            expiryInstant = midnightNextIst.toInstant();
        } else {
            // For untrusted active logins, keep device entry recorded for 30 days so it remains in Security & Devices login history
            expiryInstant = java.time.Instant.now().plus(30, java.time.temporal.ChronoUnit.DAYS);
        }
        java.sql.Timestamp expiryTimestamp = java.sql.Timestamp.from(expiryInstant);

        jdbc.update("""
                INSERT INTO trusted_devices (user_id, email, device_token, device_name, browser, operating_system, ip_address, trusted_at, expires_at, is_trusted)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
                """,
                userId, email, deviceToken,
                deviceName.isBlank() ? "Web Browser" : deviceName,
                browser.isBlank() ? "Browser" : browser,
                os.isBlank() ? "Desktop/Mobile" : os,
                clientIp,
                expiryTimestamp,
                isTrusted
        );

        return Map.of(
            "message", isTrusted ? "Device trusted successfully until midnight IST (00:00)." : "Device session recorded successfully.",
            "expiresAt", expiryInstant.toString(),
            "isTrusted", isTrusted
        );
    }

    @PostMapping("/untrust-device")
    Map<String, Object> untrustDevice(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email")).trim().toLowerCase();
        String deviceToken = AuthSupport.str(body.get("deviceToken")).trim();

        if (!email.isBlank() && !deviceToken.isBlank()) {
            // Mark as untrusted instead of deleting so the login history remains visible in Security & Devices
            jdbc.update("UPDATE trusted_devices SET is_trusted = FALSE WHERE LOWER(email) = LOWER(?) AND device_token = ?", email, deviceToken);
        }

        return Map.of("message", "Device trust removed successfully.");
    }

    @GetMapping("/account-details")
    Map<String, Object> accountDetails(@RequestParam("email") String email, @RequestParam(value = "role", defaultValue = "user") String role) {
        Map<String, Object> user = auth.findUserByEmail(email.trim().toLowerCase());
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No matching account was found.");
        }
        boolean requestedAdmin = "admin".equalsIgnoreCase(role);
        boolean accountIsAdmin = "ADMIN".equalsIgnoreCase(AuthSupport.str(user.get("role")));
        if (requestedAdmin != accountIsAdmin) {
            throw new ApiException(HttpStatus.NOT_FOUND, "No matching account was found.");
        }
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("fullName", AuthSupport.str(user.get("username")));
        response.put("email", AuthSupport.str(user.get("email")));
        return response;
    }

    @PostMapping("/admin-request")
    Map<String, Object> adminRequest(@RequestBody Map<String, Object> body) {
        String fullName = AuthSupport.str(body.get("fullName"));
        String displayName = AuthSupport.str(body.get("displayName"));
        String email = AuthSupport.str(body.get("email"));
        String password = AuthSupport.str(body.get("password"));
        if (fullName.isBlank() || displayName.isBlank() || email.isBlank() || password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "All fields are required.");
        }
        if (auth.findUserByEmail(email) != null) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        // Verify that OTP verification was completed before submitting admin registration
        if (!otpController.consumeVerifiedOtp(email.toLowerCase(), "admin")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email OTP verification is required to submit an admin account request.");
        }

        jdbc.update("INSERT INTO admin_requests (full_name, display_name, email, password_hash) VALUES (?, ?, ?, ?)",
                fullName, displayName, email, auth.passwordEncoder.encode(password));
        Long id = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        Map<String, Boolean> emailStatus = accountEmailService.sendAdminRequestEmails(fullName, displayName, email);
        return Map.of("message", "Admin access request submitted successfully.", "requestId", id,
            "adminEmailSent", emailStatus.get("adminEmailSent"),
            "requesterEmailSent", emailStatus.get("requesterEmailSent"));
    }

    @GetMapping("/admin-requests")
    Map<String, Object> adminRequests(HttpServletRequest request) {
        auth.requirePrimaryAdmin(request);
        return Map.of("requests", jdbc.queryForList("SELECT id, full_name, display_name, email, status, created_at, reviewed_at, decline_reason FROM admin_requests ORDER BY created_at DESC"));
    }

    @PutMapping("/admin-requests/{id}/decision")
    Map<String, Object> decideAdminRequest(HttpServletRequest request, @PathVariable long id, @RequestBody Map<String, Object> body) {
        auth.requirePrimaryAdmin(request);
        String decision = AuthSupport.str(body.get("decision")).trim().toLowerCase();
        String reason = AuthSupport.str(body.get("reason"));
        var rows = jdbc.queryForList("SELECT * FROM admin_requests WHERE id = ?", id);
        if (rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND, "Admin request not found.");
        Map<String, Object> row = rows.get(0);
        if (!"pending".equalsIgnoreCase(AuthSupport.str(row.get("status")))) {
            throw new ApiException(HttpStatus.CONFLICT, "This admin request has already been decided.");
        }
        boolean approved = "approve".equals(decision) || "approved".equals(decision);
        if (!approved && !("decline".equals(decision) || "declined".equals(decision) || "delete".equals(decision))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Decision must be approve, decline, or delete.");
        }
        if ("delete".equals(decision)) {
            jdbc.update("DELETE FROM admin_requests WHERE id = ?", id);
            return Map.of("message", "Admin request deleted.");
        }
        String email = AuthSupport.str(row.get("email"));
        if (approved) {
            jdbc.update("INSERT INTO users (created_at, email, password, username, role) VALUES (NOW(), ?, ?, ?, 'ADMIN')",
                    email, row.get("password_hash"), row.get("display_name"));
        }
        jdbc.update("UPDATE admin_requests SET status = ?, reviewed_at = NOW(), decline_reason = ? WHERE id = ?",
                approved ? "approved" : "declined", approved ? null : reason, id);
        boolean requesterEmailSent = accountEmailService.sendAdminDecisionEmail(row, approved, reason);
        return Map.of("message", approved ? "Admin request approved." : "Admin request declined.",
            "requesterEmailSent", requesterEmailSent);
    }

    @PostMapping("/verify-code")
    Map<String, Object> verifyCode(@RequestBody Map<String, Object> body) {
        return Map.of("valid", AuthSupport.str(body.get("code")).matches("^\\d{6}$"));
    }

    @PostMapping("/logout")
    Map<String, Object> logout(HttpServletRequest request) {
        try {
            Map<String, Object> user = auth.user(request);
            if (user != null) {
                jdbc.update(
                    "INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status) " +
                    "VALUES (NOW(), 'AUTH-SERVICE', 'INFO', 'USER_LOGOUT', ?, 'User terminated session and logged out.', '127.0.0.1', 'SUCCESS')",
                    user.get("email")
                );
            }
        } catch (Exception ignored) {}
        return Map.of("message", "Logged out successfully.");
    }

    @GetMapping("/me")
    Map<String, Object> me(HttpServletRequest request) {
        Map<String, Object> user = auth.requireUser(request);
        try {
            jdbc.update("UPDATE users SET last_active_at = NOW() WHERE id = ?", user.get("id"));
        } catch (Exception ignored) {}
        return user;
    }

    @PutMapping("/password")
    Map<String, Object> password(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> user = auth.requireUser(request);
        String currentPassword = AuthSupport.str(body.get("currentPassword"));
        String newPassword = AuthSupport.str(body.get("newPassword"));
        if (currentPassword.isBlank() || newPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password and new password are required.");
        }
        String role = "admin".equalsIgnoreCase(AuthSupport.str(user.get("role"))) ? "admin" : "user";
        if (!otpController.consumeVerifiedOtp(AuthSupport.str(user.get("email")).toLowerCase(), role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verify the OTP before changing your password.");
        }
        auth.validatePasswordStrength(newPassword);
        Map<String, Object> dbUser = auth.findUserByEmail(AuthSupport.str(user.get("email")));
        if (!auth.passwordEncoder.matches(currentPassword, AuthSupport.str(dbUser.get("password")))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
        }
        jdbc.update("UPDATE users SET password = ? WHERE id = ?", auth.passwordEncoder.encode(newPassword), user.get("id"));
        boolean emailSent = accountEmailService.sendPasswordChangedEmail(AuthSupport.str(user.get("name")), AuthSupport.str(user.get("email")));
        return Map.of("message", "Password updated successfully.", "notificationEmailSent", emailSent);
    }

    @PostMapping("/forgot-password")
    Map<String, Object> forgotPassword(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email"));
        String fullName = AuthSupport.str(AuthSupport.first(body.get("fullName"), email.split("@")[0]));
        String role = AuthSupport.str(AuthSupport.first(body.get("role"), "user"));
        String newPassword = AuthSupport.str(body.get("newPassword"));
        if (email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email is required.");
        }
        if (!newPassword.isBlank()) {
            auth.validatePasswordStrength(newPassword);
        }
        Map<String, Object> existing = auth.findUserByEmail(email);
        boolean roleMatches = "admin".equalsIgnoreCase(role)
            ? "ADMIN".equalsIgnoreCase(AuthSupport.str(existing == null ? null : existing.get("role")))
            : existing != null && !"ADMIN".equalsIgnoreCase(AuthSupport.str(existing.get("role")));
        if (existing == null || !roleMatches || !AuthSupport.str(existing.get("username")).equalsIgnoreCase(fullName)
                || !otpController.consumeVerifiedOtp(email.toLowerCase(), role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verify the OTP and account details before resetting your password.");
        }
        String hash = auth.passwordEncoder.encode(newPassword);
        jdbc.update("UPDATE users SET password = ? WHERE id = ?", hash, existing.get("id"));
        boolean emailSent = accountEmailService.sendPasswordChangedEmail(AuthSupport.str(existing.get("username")), email);
        return Map.of("message", "Password reset successfully.", "notificationEmailSent", emailSent);
    }

    @PostMapping("/reset-password")
    Map<String, Object> resetPassword(@RequestBody Map<String, Object> body) {
        String email = AuthSupport.str(body.get("email"));
        String fullName = AuthSupport.str(body.get("fullName"));
        String role = AuthSupport.str(AuthSupport.first(body.get("role"), "user"));
        String newPassword = AuthSupport.str(body.get("newPassword"));
        if (email.isBlank() || newPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email and new password are required.");
        }
        auth.validatePasswordStrength(newPassword);
        Map<String, Object> user = auth.findUserByEmail(email);
        boolean roleMatches = "admin".equalsIgnoreCase(role)
                ? user != null && "ADMIN".equalsIgnoreCase(AuthSupport.str(user.get("role")))
                : user != null && !"ADMIN".equalsIgnoreCase(AuthSupport.str(user.get("role")));
        if (!roleMatches || !AuthSupport.str(user.get("username")).equalsIgnoreCase(fullName)
                || !otpController.consumeVerifiedOtp(email.toLowerCase(), role)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verify the OTP and account details before resetting your password.");
        }
        jdbc.update("UPDATE users SET password = ? WHERE id = ?", auth.passwordEncoder.encode(newPassword), user.get("id"));
        boolean emailSent = accountEmailService.sendPasswordChangedEmail(AuthSupport.str(user.get("username")), email);
        return Map.of("message", "Password reset successfully.", "notificationEmailSent", emailSent);
    }

    @GetMapping("/verify-college")
    Map<String, Object> checkCollege(@RequestParam("name") String name) {
        if (name == null || name.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "College name is required.");
        }
        boolean verified = auth.verifyUniversity(name);
        return Map.of("verified", verified, "name", name);
    }
}
