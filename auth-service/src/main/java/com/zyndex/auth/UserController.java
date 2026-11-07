package com.zyndex.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
class UserController {
    private final JdbcTemplate jdbc;
    private final AuthSupport auth;
    private final SqlSupport sql;
    private final AccountEmailService accountEmailService;
    private final OtpController otpController;

    UserController(JdbcTemplate jdbc, AuthSupport auth, SqlSupport sql, AccountEmailService accountEmailService, OtpController otpController) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.sql = sql;
        this.accountEmailService = accountEmailService;
        this.otpController = otpController;
    }

    @GetMapping("/{userId}/profile")
    Map<String, Object> profile(HttpServletRequest request, @PathVariable("userId") String userId) {
        String internalHeader = request.getHeader("X-Internal-Service");
        if ("subscription-service".equalsIgnoreCase(internalHeader) || "content-service".equalsIgnoreCase(internalHeader)) {
            Map<String, Object> internalUser = auth.findUserById(Long.parseLong(userId));
            if (internalUser == null) {
                throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
            }
            return auth.sanitizeUser(internalUser);
        }
        Map<String, Object> user = auth.requireUser(request);
        long target = "me".equals(userId) ? AuthSupport.number(user.get("id")) : Long.parseLong(userId);
        if (target != AuthSupport.number(user.get("id")) && !"admin".equals(user.get("role"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only view your own profile.");
        }
        Map<String, Object> row = auth.findUserById(target);
        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }
        return auth.sanitizeUser(row);
    }

    @PutMapping("/profile")
    Map<String, Object> updateProfile(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> user = auth.requireUser(request);
        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String collegeName = AuthSupport.str(body.get("collegeName"));
        String universityName = AuthSupport.str(body.get("universityName"));
        String registrationNo = AuthSupport.str(body.get("registrationNo"));
        String bio = AuthSupport.str(body.get("bio"));
        String userType = AuthSupport.str(body.get("userType"));
        String profession = AuthSupport.str(body.get("profession"));

        if (name.isBlank() || email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name and email are required.");
        }

        // If college/university details are supplied, verify them online
        if (!collegeName.isBlank() || !universityName.isBlank()) {
            boolean collegeVerified = collegeName.isBlank() || auth.verifyUniversity(collegeName);
            boolean universityVerified = universityName.isBlank() || auth.verifyUniversity(universityName);
            if (!collegeVerified && !universityVerified) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Neither College Name nor University Name could be verified online. Please enter a valid name.");
            }
        }

        jdbc.update("UPDATE users SET username = ?, email = ?, user_type = ?, profession = ?, college_name = ?, university_name = ?, registration_no = ?, bio = ? WHERE id = ?",
            name, email, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio, user.get("id"));
        Map<String, Object> updated = auth.sanitizeUser(auth.findUserById(AuthSupport.number(user.get("id"))));
        updated.put("token", auth.signToken(updated));
        return updated;
    }

    @PostMapping("/avatar")
    Map<String, Object> avatar(HttpServletRequest request, @ModelAttribute AvatarForm ignored) {
        auth.requireUser(request);
        return Map.of("avatarUrl", "");
    }

    @GetMapping
    Map<String, Object> all(HttpServletRequest request, @RequestParam Map<String, String> query) {
        auth.requireRole(auth.requireUser(request), "admin");
        var page = sql.page(query);
        String search = "%" + AuthSupport.str(query.get("search")) + "%";
        var rows = jdbc.queryForList("SELECT * FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                search, search, page.get("size"), page.get("offset"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username LIKE ? OR email LIKE ?", Long.class, search, search);
        return sql.pageResult("users", rows.stream().map(row -> {
            Map<String, Object> sanitized = auth.sanitizeUser(row);
            Object lastActiveObj = row.get("last_active_at");
            boolean isOnline = false;
            if (lastActiveObj != null) {
                try {
                    java.time.Instant lastActiveInstant = null;
                    if (lastActiveObj instanceof java.sql.Timestamp) {
                        lastActiveInstant = ((java.sql.Timestamp) lastActiveObj).toInstant();
                    } else if (lastActiveObj instanceof java.time.LocalDateTime) {
                        lastActiveInstant = ((java.time.LocalDateTime) lastActiveObj).toInstant(java.time.ZoneOffset.UTC);
                    } else if (lastActiveObj instanceof java.time.Instant) {
                        lastActiveInstant = (java.time.Instant) lastActiveObj;
                    }
                    if (lastActiveInstant != null) {
                        // Considered actively online if seen within last 15 minutes
                        isOnline = java.time.Duration.between(lastActiveInstant, java.time.Instant.now()).toMinutes() <= 15;
                    }
                } catch (Exception ignored) {}
            }
            return Map.ofEntries(
                Map.entry("id", sanitized.get("id")),
                Map.entry("name", sanitized.get("name")),
                Map.entry("email", sanitized.get("email")),
                Map.entry("role", sanitized.get("role")),
                Map.entry("registrationNo", sanitized.get("registrationNo")),
                Map.entry("userType", sanitized.get("userType")),
                Map.entry("profession", sanitized.get("profession")),
                Map.entry("collegeName", sanitized.get("collegeName")),
                Map.entry("universityName", sanitized.get("universityName")),
                Map.entry("bio", sanitized.get("bio")),
                Map.entry("active", sanitized.get("active")),
                Map.entry("terminated", sanitized.get("terminated") != null ? sanitized.get("terminated") : false),
                Map.entry("isOnline", isOnline),
                Map.entry("lastActiveAt", lastActiveObj != null ? String.valueOf(lastActiveObj) : ""),
                Map.entry("dateJoined", sanitized.get("createdAt")),
                Map.entry("subscriptionPlan", sanitized.get("subscriptionPlan") != null ? sanitized.get("subscriptionPlan") : "FREE"),
                Map.entry("subscriptionExpiresAt", sanitized.get("subscriptionExpiresAt") != null ? sanitized.get("subscriptionExpiresAt") : "")
            );
        }).toList(), total, page.get("page"), page.get("size"));
    }

    @GetMapping("/stats")
    Map<String, Object> stats(HttpServletRequest request) {
        auth.requireRole(auth.requireUser(request), "admin");
        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM users", Long.class);
        Long active = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE active = true", Long.class);
        Long students = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE role != 'ADMIN'", Long.class);
        return Map.of(
            "totalUsers", total != null ? total : 0L,
            "total", total != null ? total : 0L,
            "activeUsers", active != null ? active : 0L,
            "studentCount", students != null ? students : 0L
        );
    }

    @PostMapping
    Map<String, Object> create(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> currentUser = auth.requireUser(request);
        auth.requireRole(currentUser, "admin");
        boolean isPrimary = Boolean.TRUE.equals(currentUser.get("isPrimaryAdmin"));

        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String password = AuthSupport.str(body.get("password"));
        String userType = AuthSupport.str(body.get("userType"));
        String profession = AuthSupport.str(body.get("profession"));
        String collegeName = AuthSupport.str(body.get("collegeName"));
        String universityName = AuthSupport.str(body.get("universityName"));
        String registrationNo = AuthSupport.str(body.get("registrationNo"));
        String bio = AuthSupport.str(body.get("bio"));
        if (name.isBlank() || email.isBlank() || password.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Name, email, and password are required.");
        }
        auth.validatePasswordStrength(password);

        String desiredRole = "admin".equalsIgnoreCase(String.valueOf(body.get("role"))) ? "ADMIN" : "STUDENT";
        if ("ADMIN".equals(desiredRole) && !isPrimary) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the main administrator can create admin users.");
        }

        jdbc.update("INSERT INTO users (created_at, email, password, username, role, user_type, profession, college_name, university_name, registration_no, bio) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            email, auth.passwordEncoder.encode(password), name, desiredRole, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio);
        Long userId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);

        String subscriptionPlan = AuthSupport.str(body.get("subscriptionPlan"));
        int durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;
        if (!subscriptionPlan.isBlank() && userId != null) {
            auth.updateUserSubscription(userId, subscriptionPlan, durationDays);
        }

        try {
            Map<String, Object> createdUser = auth.sanitizeUser(auth.findUserById(userId));
            String plan = subscriptionPlan.isBlank() || "FREE".equalsIgnoreCase(subscriptionPlan) ? "Free / Demo" : subscriptionPlan.replace("_", " ");
            String validUntil = String.valueOf(createdUser.getOrDefault("subscriptionExpiresAt", "No expiry"));
            accountEmailService.sendSignupConfirmationEmail(name, email, plan, validUntil);
            return Map.of(
                    "message", "User created successfully. Confirmation email sent.",
                    "userId", userId,
                    "confirmationEmailSent", true,
                    "confirmationEmailError", "");
        } catch (MailException | ApiException error) {
            return Map.of(
                    "message", "User created successfully, but confirmation email could not be sent.",
                    "userId", userId,
                    "confirmationEmailSent", false,
                    "confirmationEmailError", error.getMessage() == null ? "Confirmation email could not be sent." : error.getMessage());
        }
    }

    @PutMapping("/{userId}")
    Map<String, Object> update(HttpServletRequest request, @PathVariable("userId") long userId, @RequestBody Map<String, Object> body) {
        Map<String, Object> currentUser = auth.requireUser(request);
        auth.requireRole(currentUser, "admin");
        boolean isPrimary = Boolean.TRUE.equals(currentUser.get("isPrimaryAdmin"));

        Map<String, Object> existingUser = auth.findUserById(userId);
        if (existingUser == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }
        String oldRole = AuthSupport.str(existingUser.get("role"));
        if (oldRole.isBlank()) oldRole = "STUDENT";

        // Prevent modifying primary admin account if not primary admin
        if (Boolean.TRUE.equals(existingUser.get("is_primary_admin")) && !isPrimary) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the main administrator can modify the primary admin account.");
        }

        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String desiredRole = body.containsKey("role") 
                ? ("admin".equalsIgnoreCase(String.valueOf(body.get("role"))) ? "ADMIN" : "STUDENT")
                : oldRole;

        boolean roleChanged = !oldRole.equalsIgnoreCase(desiredRole);
        if (roleChanged && !isPrimary) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the main administrator can change platform roles.");
        }
        String role = roleChanged ? desiredRole : oldRole;

        String password = AuthSupport.str(body.get("password"));
        String userType = AuthSupport.str(body.get("userType"));
        String profession = AuthSupport.str(body.get("profession"));
        String collegeName = AuthSupport.str(body.get("collegeName"));
        String universityName = AuthSupport.str(body.get("universityName"));
        String registrationNo = AuthSupport.str(body.get("registrationNo"));
        String bio = AuthSupport.str(body.get("bio"));

        Boolean planNotificationSent = null;
        if (body.containsKey("subscriptionPlan")) {
            String subscriptionPlan = AuthSupport.str(body.get("subscriptionPlan"));
            int durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;
            if (!subscriptionPlan.isBlank()) {
                Map<String, Object> subscriptionUpdate = auth.updateUserSubscription(userId, subscriptionPlan, durationDays);
                planNotificationSent = Boolean.TRUE.equals(subscriptionUpdate.get("notificationEmailSent"));
            }
        }

        if (password.isBlank()) {
            jdbc.update("UPDATE users SET username = ?, email = ?, role = ?, user_type = ?, profession = ?, college_name = ?, university_name = ?, registration_no = ?, bio = ? WHERE id = ?", name, email, role, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio, userId);
        } else {
            jdbc.update("UPDATE users SET username = ?, email = ?, role = ?, user_type = ?, profession = ?, college_name = ?, university_name = ?, registration_no = ?, bio = ?, password = ? WHERE id = ?", name, email, role, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio, auth.passwordEncoder.encode(password), userId);
        }

        boolean roleEmailSent = false;
        if (roleChanged) {
            String adminName = request.getHeader("X-User-Name");
            if (adminName == null || adminName.isBlank()) adminName = "Main Administrator";
            String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            roleEmailSent = accountEmailService.sendRoleChangedEmail(name, email, oldRole, role, adminName, timestamp);
        }

        if (!password.isBlank()) {
            accountEmailService.sendPasswordChangedEmail(name, email);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "User updated successfully.");
        result.put("roleChanged", roleChanged);
        result.put("roleEmailSent", roleEmailSent);
        if (planNotificationSent != null) {
            result.put("notificationEmailSent", planNotificationSent);
        }
        return result;
    }

    @PutMapping("/{userId}/role")
    Map<String, Object> updateRole(HttpServletRequest request, @PathVariable("userId") long userId, @RequestBody Map<String, Object> body) {
        auth.requirePrimaryAdmin(request);
        Map<String, Object> existingUser = auth.findUserById(userId);
        if (existingUser == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }
        String oldRole = AuthSupport.str(existingUser.get("role"));
        if (oldRole.isBlank()) oldRole = "STUDENT";
        String newRole = "admin".equalsIgnoreCase(String.valueOf(body.get("role"))) ? "ADMIN" : "STUDENT";

        jdbc.update("UPDATE users SET role = ? WHERE id = ?", newRole, userId);

        boolean roleEmailSent = false;
        if (!oldRole.equalsIgnoreCase(newRole)) {
            String name = String.valueOf(AuthSupport.first(existingUser.get("username"), AuthSupport.first(existingUser.get("name"), "User")));
            String email = AuthSupport.str(existingUser.get("email"));
            String adminName = request.getHeader("X-User-Name");
            if (adminName == null || adminName.isBlank()) adminName = "Main Administrator";
            String timestamp = java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            roleEmailSent = accountEmailService.sendRoleChangedEmail(name, email, oldRole, newRole, adminName, timestamp);
        }

        return Map.of("message", "User role updated successfully.", "roleEmailSent", roleEmailSent);
    }

    @PutMapping("/{userId}/status")
    Map<String, Object> updateStatus(HttpServletRequest request, @PathVariable("userId") long userId, @RequestBody Map<String, Object> body) {
        auth.requirePrimaryAdmin(request);
        boolean active = AuthSupport.bool(body.get("active"));
        jdbc.update("UPDATE users SET active = ? WHERE id = ?", active, userId);
        return Map.of("message", "User active status updated successfully.");
    }

    @DeleteMapping("/profile/delete-account")
    Map<String, Object> deleteOwnAccount(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> caller = auth.requireUser(request);
        long userId = AuthSupport.number(caller.get("id"));
        String email = String.valueOf(caller.get("email")).toLowerCase().trim();
        String role = String.valueOf(caller.get("role")).toLowerCase().trim();
        boolean isPrimary = Boolean.TRUE.equals(caller.get("isPrimaryAdmin")) || Boolean.TRUE.equals(caller.get("is_primary_admin"));

        if (isPrimary) {
            throw new ApiException(HttpStatus.FORBIDDEN, "The Primary Administrator account cannot be deleted via self-service.");
        }

        String confirmText = AuthSupport.str(body.get("confirmText")).trim();
        if (!"CONFIRM".equals(confirmText)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please type 'CONFIRM' to verify deletion.");
        }

        String otp = AuthSupport.str(body.get("otp")).trim();
        if (otp.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP verification code is required.");
        }

        // Verify and consume OTP
        Map<String, Object> verifyBody = Map.of("email", email, "otp", otp, "role", role);
        try {
            otpController.verify(verifyBody);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired OTP: " + e.getMessage());
        }

        // Gather reasons & feedback
        String reasons = AuthSupport.str(body.get("reasons"));
        String comments = AuthSupport.str(body.get("comments"));
        String name = String.valueOf(AuthSupport.first(caller.get("name"), caller.get("username")));
        String timestamp = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata"))
                .format(java.time.format.DateTimeFormatter.ofPattern("dd MMMM yyyy, hh:mm:ss a (z)"));

        // Delete user row and invalidate trusted devices
        jdbc.update("DELETE FROM trusted_devices WHERE user_id = ? OR email = ?", userId, email);
        jdbc.update("DELETE FROM users WHERE id = ?", userId);

        // Audit log in microservices
        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'WARN', 'USER_SELF_DELETED', ?, ?, ?, 'SUCCESS')
                    """, email, "User or Admin self-deleted account (" + name + ", Role: " + role + "). Reasons: " + reasons + " | Comments: " + comments, request.getRemoteAddr());
        } catch (Exception ignored) {}

        // Send farewell email to user and comprehensive audit report to Bhaanugali
        new Thread(() -> {
            accountEmailService.sendAccountDeletionSuccessEmail(name, email, role.toUpperCase(), reasons, comments, timestamp);
        }).start();

        return Map.of("message", "Your account has been deleted successfully. We are sorry to lose an amazing user.");
    }

    @DeleteMapping("/{userId}")
    Map<String, Object> delete(HttpServletRequest request, @PathVariable("userId") long userId) {
        Map<String, Object> caller = auth.requireUser(request);
        auth.requireRole(caller, "admin");
        boolean isPrimary = Boolean.TRUE.equals(caller.get("isPrimaryAdmin"));

        if (userId == AuthSupport.number(caller.get("id"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete the account you are currently logged in with.");
        }

        Map<String, Object> target = auth.findUserById(userId);
        if (target == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }

        // Only Primary Admin can delete Admin accounts
        boolean targetIsAdmin = "ADMIN".equalsIgnoreCase(AuthSupport.str(target.get("role"))) || Boolean.TRUE.equals(target.get("is_primary_admin"));
        if (targetIsAdmin && !isPrimary) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the main administrator can delete admin accounts.");
        }

        jdbc.update("DELETE FROM users WHERE id = ?", userId);
        return Map.of("message", "User deleted successfully.");
    }

    @PostMapping("/{userId}/force-logout")
    Map<String, Object> forceLogout(HttpServletRequest request, @PathVariable("userId") long userId) {
        Map<String, Object> admin = auth.requirePrimaryAdmin(request);
        Map<String, Object> target = auth.findUserById(userId);
        if (target == null) throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");

        // Mark user as terminated, increment session token version and clear last_active_at
        jdbc.update("UPDATE users SET terminated = true, session_token_version = session_token_version + 1, last_active_at = NULL WHERE id = ?", userId);

        String targetName = String.valueOf(AuthSupport.first(target.get("name"), target.get("username")));
        String targetEmail = String.valueOf(target.get("email"));
        String adminEmail = String.valueOf(admin.get("email"));

        // Record high-priority audit logs in both microservice and admin audit trails
        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'WARN', 'ADMIN_FORCE_LOGOUT_USER', ?, ?, ?, 'SUCCESS')
                    """, adminEmail, "Administrator terminated active session and revoked access for user: " + targetName + " (" + targetEmail + ", ID: " + userId + ")", request.getRemoteAddr());
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'WARN', 'USER_SESSION_TERMINATED', ?, ?, ?, 'SUCCESS')
                    """, targetEmail, "Active session token invalidated. Incremented session_token_version to enforce immediate logout for user ID: " + userId, request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of("message", "User session terminated and account marked terminated by administrator.", "userId", userId);
    }

    @PostMapping("/{userId}/restore-access")
    Map<String, Object> restoreAccess(HttpServletRequest request, @PathVariable("userId") long userId) {
        Map<String, Object> admin = auth.requirePrimaryAdmin(request);
        Map<String, Object> target = auth.findUserById(userId);
        if (target == null) throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");

        jdbc.update("UPDATE users SET terminated = false, active = true WHERE id = ?", userId);

        String targetName = String.valueOf(AuthSupport.first(target.get("name"), target.get("username")));
        String targetEmail = String.valueOf(target.get("email"));
        String adminEmail = String.valueOf(admin.get("email"));

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'INFO', 'ADMIN_RESTORE_USER_ACCESS', ?, ?, ?, 'SUCCESS')
                    """, adminEmail, "Administrator restored platform access for terminated user: " + targetName + " (" + targetEmail + ", ID: " + userId + ")", request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of("message", "User access successfully restored by administrator.", "userId", userId);
    }

    @PostMapping("/force-logout-all")
    Map<String, Object> forceLogoutAll(HttpServletRequest request) {
        Map<String, Object> admin = auth.requirePrimaryAdmin(request);
        long adminId = AuthSupport.number(admin.get("id"));
        String adminEmail = String.valueOf(admin.get("email"));

        // Terminate all sessions except the primary admin's own session
        jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id != ?", adminId);

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'WARN', 'ADMIN_FORCE_LOGOUT_ALL', ?, ?, ?, 'SUCCESS')
                    """, adminEmail, "Administrator terminated all active student and reader sessions across the platform", request.getRemoteAddr());
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'WARN', 'ALL_USER_SESSIONS_TERMINATED', ?, ?, ?, 'SUCCESS')
                    """, adminEmail, "Global session token versions incremented. Involuntary logout enforced for all active accounts except primary admin", request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of("message", "All active user sessions have been terminated by the administrator.");
    }

    @GetMapping("/maintenance-mode")
    Map<String, Object> getMaintenanceStatus() {
        var rows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_MODE' LIMIT 1");
        boolean enabled = !rows.isEmpty() && "true".equalsIgnoreCase(String.valueOf(rows.get(0).get("setting_value")));
        
        var timeRows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT' LIMIT 1");
        String scheduledAt = !timeRows.isEmpty() && timeRows.get(0).get("setting_value") != null ? String.valueOf(timeRows.get(0).get("setting_value")) : null;

        return Map.of(
            "maintenanceMode", enabled,
            "scheduledAt", scheduledAt != null ? scheduledAt : ""
        );
    }

    @PostMapping("/maintenance-mode")
    Map<String, Object> toggleMaintenanceMode(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> admin = auth.requirePrimaryAdmin(request);
        long adminId = AuthSupport.number(admin.get("id"));
        boolean enable = AuthSupport.bool(body.get("enabled"));
        String actionType = AuthSupport.str(body.get("actionType")); // "SCHEDULE_START" | "FORCE_OFFICIAL_NOW" | "DEACTIVATE"
        
        if (enable) {
            String nowIso = java.time.Instant.now().toString();
            jdbc.update("""
                    INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
                    VALUES ('MAINTENANCE_MODE', 'true', NOW(), ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
                    """, admin.get("email"));

            jdbc.update("""
                    INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
                    VALUES ('MAINTENANCE_SCHEDULED_AT', ?, NOW(), ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
                    """, nowIso, admin.get("email"));

            // Broadcast emails asynchronously to all active platform users and regular admins
            new Thread(() -> {
                try {
                    var users = jdbc.queryForList("SELECT id, name, username, email FROM users WHERE id != ?", adminId);
                    for (var u : users) {
                        String name = String.valueOf(AuthSupport.first(u.get("name"), u.get("username")));
                        String email = String.valueOf(u.get("email"));
                        accountEmailService.sendMaintenanceScheduledEmail(name, email);
                    }
                } catch (Exception err) {
                    System.err.println("Broadcast maintenance warning email failed: " + err.getMessage());
                }
            }).start();

        } else {
            jdbc.update("""
                    INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
                    VALUES ('MAINTENANCE_MODE', 'false', NOW(), ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
                    """, admin.get("email"));

            jdbc.update("DELETE FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT'");

            // Broadcast maintenance concluded email
            new Thread(() -> {
                try {
                    var users = jdbc.queryForList("SELECT id, name, username, email FROM users WHERE id != ?", adminId);
                    for (var u : users) {
                        String name = String.valueOf(AuthSupport.first(u.get("name"), u.get("username")));
                        String email = String.valueOf(u.get("email"));
                        accountEmailService.sendMaintenanceConcludedEmail(name, email);
                    }
                } catch (Exception err) {
                    System.err.println("Broadcast maintenance concluded email failed: " + err.getMessage());
                }
            }).start();
        }

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'WARN', 'ADMIN_TOGGLE_MAINTENANCE_MODE', ?, ?, ?, 'SUCCESS')
                    """, admin.get("email"), "Administrator toggled platform maintenance mode to: " + (enable ? "ACTIVATED (15-min countdown triggered & email broadcast dispatched)" : "DEACTIVATED (Back Online email broadcast dispatched)"), request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of("maintenanceMode", enable, "message", enable ? "Maintenance mode activated. Broadcast email sent and 15-minute countdown started." : "Maintenance mode deactivated. Zyndex is back online.");
    }

    @PostMapping("/maintenance-officially-active")
    Map<String, Object> finalizeMaintenanceActive(HttpServletRequest request) {
        // Called when 15-minute window elapses or admin enforces immediate official offline mode
        var adminRows = jdbc.queryForList("SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", auth.properties.mainAdminEmail());
        long adminId = adminRows.isEmpty() ? 0L : AuthSupport.number(adminRows.get(0).get("id"));

        // Immediately revoke all other active sessions across the platform
        jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id != ?", adminId);

        // Broadcast email: Zyndex is now officially in maintenance
        new Thread(() -> {
            try {
                var users = jdbc.queryForList("SELECT id, name, username, email FROM users WHERE id != ?", adminId);
                for (var u : users) {
                    String name = String.valueOf(AuthSupport.first(u.get("name"), u.get("username")));
                    String email = String.valueOf(u.get("email"));
                    accountEmailService.sendMaintenanceActiveEmail(name, email);
                }
            } catch (Exception err) {
                System.err.println("Broadcast maintenance active email failed: " + err.getMessage());
            }
        }).start();

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'WARN', 'MAINTENANCE_OFFICIALLY_ACTIVE', 'system', '15-minute countdown elapsed. All active users and regular admins terminated and maintenance active emails dispatched.', '127.0.0.1', 'SUCCESS')
                    """);
        } catch (Exception ignored) {}

        return Map.of("message", "Maintenance is now officially active. All sessions terminated and emails dispatched.");
    }

    @PostMapping("/send-subscription-email")
    Map<String, Object> sendSubscriptionEmail(@RequestBody Map<String, Object> body) {
        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String plan = AuthSupport.str(body.get("plan"));
        double amount = body.get("amount") != null ? Double.parseDouble(String.valueOf(body.get("amount"))) : 0.0;
        int durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;

        try {
            accountEmailService.sendSubscriptionConfirmationEmail(name, email, plan, amount, durationDays);
            return Map.of("success", true, "message", "Subscription email sent successfully.");
        } catch (Exception e) {
            System.err.println("Failed to send subscription email: " + e.getMessage());
            return Map.of("success", false, "message", e.getMessage());
        }
    }
    
    @PostMapping("/internal/plan-upgrade-email")
    Map<String, Object> planUpgradeEmail(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        if (!"subscription-service".equalsIgnoreCase(request.getHeader("X-Internal-Service"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Internal email delivery is restricted.");
        }
        long userId = AuthSupport.number(body.get("userId"));
        Map<String, Object> user = auth.findUserById(userId);
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found.");
        }
        accountEmailService.sendPlanUpgradeEmail(
                AuthSupport.str(user.get("username")),
                AuthSupport.str(user.get("email")),
                AuthSupport.str(body.get("previousPlan")),
                AuthSupport.str(body.get("newPlan")),
                body.get("activationDate"),
                body.get("validUntil"),
                AuthSupport.str(body.get("orderId")),
                AuthSupport.str(body.get("utr")),
                AuthSupport.str(body.get("paymentTime")),
                AuthSupport.str(body.get("status")));
        return Map.of("notificationEmailSent", true);
    }

    static class AvatarForm {
        public MultipartFile avatar;
    }
}
