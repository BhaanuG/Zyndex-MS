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
            // When an admin changes the user's role (e.g. ADMIN -> STUDENT/user or vice versa),
            // increment session_token_version so obsolete tokens with the wrong role/permissions
            // are immediately invalidated and the user is prompted to authenticate with their new role.
            jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id = ?", userId);

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
            // Invalidate existing sessions immediately so the user can switch to their new portal cleanly
            jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id = ?", userId);

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
        jdbc.update("UPDATE users SET is_terminated = true, session_token_version = session_token_version + 1, last_active_at = NULL WHERE id = ?", userId);

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

        jdbc.update("UPDATE users SET is_terminated = false, active = true WHERE id = ?", userId);

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

        boolean isOfficiallyActive = false;
        if (enabled) {
            if (scheduledAt != null && !scheduledAt.isBlank()) {
                try {
                    java.time.Instant scheduledInstant = java.time.Instant.parse(scheduledAt);
                    long elapsedSeconds = java.time.Duration.between(scheduledInstant, java.time.Instant.now()).getSeconds();
                    if (elapsedSeconds >= 15 * 60) {
                        isOfficiallyActive = true;
                    }
                } catch (Exception ignored) {
                    isOfficiallyActive = true;
                }
            } else {
                isOfficiallyActive = true;
            }
        }

        return Map.of(
            "maintenanceMode", enabled,
            "isOfficiallyActive", isOfficiallyActive,
            "scheduledAt", scheduledAt != null ? scheduledAt : ""
        );
    }

    @PostMapping("/maintenance-mode")
    Map<String, Object> toggleMaintenanceMode(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> admin = auth.requirePrimaryAdmin(request);
        long adminId = AuthSupport.number(admin.get("id"));
        boolean enable = AuthSupport.bool(body.get("enabled"));
        
        boolean isCancelledBeforeTimer = false;
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
                    var users = jdbc.queryForList("SELECT id, username, email FROM users WHERE id != ?", adminId);
                    for (var u : users) {
                        String name = String.valueOf(AuthSupport.first(u.get("username"), "Scholar"));
                        String email = String.valueOf(u.get("email"));
                        accountEmailService.sendMaintenanceScheduledEmail(name, email);
                    }
                } catch (Exception err) {
                    System.err.println("Broadcast maintenance warning email failed: " + err.getMessage());
                }
            }).start();

        } else {
            // Check if maintenance was previously scheduled and whether the 15-minute countdown was still pending
            var prevScheduleRows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT' LIMIT 1");
            if (!prevScheduleRows.isEmpty() && prevScheduleRows.get(0).get("setting_value") != null) {
                try {
                    String prevIso = String.valueOf(prevScheduleRows.get(0).get("setting_value"));
                    java.time.Instant scheduledInstant = java.time.Instant.parse(prevIso);
                    long elapsedSeconds = java.time.Duration.between(scheduledInstant, java.time.Instant.now()).getSeconds();
                    if (elapsedSeconds < 15 * 60) {
                        isCancelledBeforeTimer = true;
                    }
                } catch (Exception ignored) {}
            }

            jdbc.update("""
                    INSERT INTO system_settings (setting_key, setting_value, updated_at, updated_by)
                    VALUES ('MAINTENANCE_MODE', 'false', NOW(), ?)
                    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW(), updated_by = VALUES(updated_by)
                    """, admin.get("email"));

            jdbc.update("DELETE FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT'");

            final boolean cancelledBeforeTimer = isCancelledBeforeTimer;

            // Broadcast email: either "Maintenance Postponed / Cancelled" (if turned off before timer ended) or "Maintenance Concluded" (if after completion)
            new Thread(() -> {
                try {
                    var users = jdbc.queryForList("SELECT id, username, email FROM users WHERE id != ?", adminId);
                    for (var u : users) {
                        String name = String.valueOf(AuthSupport.first(u.get("username"), "Scholar"));
                        String email = String.valueOf(u.get("email"));
                        if (cancelledBeforeTimer) {
                            accountEmailService.sendMaintenanceCancelledEmail(name, email);
                        } else {
                            accountEmailService.sendMaintenanceConcludedEmail(name, email);
                        }
                    }
                } catch (Exception err) {
                    System.err.println("Broadcast maintenance cancellation/conclusion email failed: " + err.getMessage());
                }
            }).start();
        }

        String logDetail = enable
                ? "Primary administrator " + admin.get("email") + " initiated platform maintenance mode. 15-minute countdown timer started and broadcast warning emails dispatched to all users."
                : (isCancelledBeforeTimer
                    ? "Primary administrator " + admin.get("email") + " cancelled/postponed platform maintenance mode before the 15-minute countdown expired. Countdown timer disabled and cancellation notices dispatched to all users."
                    : "Primary administrator " + admin.get("email") + " concluded platform maintenance mode. Platform marked 100% operational and back-online notices dispatched to all users.");

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'WARN', 'ADMIN_TOGGLE_MAINTENANCE_MODE', ?, ?, ?, 'SUCCESS')
                    """, admin.get("email"), logDetail, request.getRemoteAddr());
        } catch (Exception ignored) {}

        String responseMessage = enable
                ? "Maintenance mode activated. Broadcast email sent and 15-minute countdown started."
                : (isCancelledBeforeTimer
                    ? "Maintenance mode cancelled before countdown expired. Timer disabled and cancellation emails dispatched to users."
                    : "Maintenance mode deactivated. Zyndex is back online.");

        return Map.of("maintenanceMode", enable, "message", responseMessage);
    }

    @PostMapping("/maintenance-officially-active")
    Map<String, Object> finalizeMaintenanceActive(HttpServletRequest request) {
        // Only finalize if maintenance mode is enabled in system settings
        var maintRows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_MODE' LIMIT 1");
        if (maintRows.isEmpty() || !"true".equalsIgnoreCase(String.valueOf(maintRows.get(0).get("setting_value")))) {
            return Map.of("message", "Maintenance mode is not active.");
        }

        // Verify that the 15-minute countdown window has truly elapsed on the server
        var timeRows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT' LIMIT 1");
        if (!timeRows.isEmpty() && timeRows.get(0).get("setting_value") != null) {
            try {
                String schedStr = String.valueOf(timeRows.get(0).get("setting_value"));
                java.time.Instant scheduledInstant = java.time.Instant.parse(schedStr);
                long elapsedSeconds = java.time.Duration.between(scheduledInstant, java.time.Instant.now()).getSeconds();
                if (elapsedSeconds < 15 * 60) {
                    return Map.of("message", "Maintenance preparation window is still pending (" + (15 * 60 - elapsedSeconds) + " seconds remaining).");
                }
            } catch (Exception ignored) {}
        }

        var adminRows = jdbc.queryForList("SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", auth.properties.mainAdminEmail());
        long adminId = adminRows.isEmpty() ? 0L : AuthSupport.number(adminRows.get(0).get("id"));

        // Immediately revoke all other active sessions across the platform
        jdbc.update("UPDATE users SET session_token_version = session_token_version + 1, last_active_at = NULL WHERE id != ?", adminId);

        // Broadcast email: Zyndex is now officially in maintenance
        new Thread(() -> {
            try {
                var users = jdbc.queryForList("SELECT id, username, email FROM users WHERE id != ?", adminId);
                for (var u : users) {
                    String name = String.valueOf(AuthSupport.first(u.get("username"), "Scholar"));
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

    @GetMapping("/preferences")
    Map<String, Object> getPreferences(HttpServletRequest request) {
        Map<String, Object> user = auth.requireUser(request);
        long userId = AuthSupport.number(user.get("id"));

        var rows = jdbc.queryForList("SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1", userId);
        if (rows.isEmpty()) {
            return Map.of(
                "citationStyle", "APA 7th",
                "readerTheme", "light",
                "readerFontScale", 100,
                "notifyNewReleases", true,
                "notifyExpiryReminders", true,
                "notifySecurityAlerts", true,
                "adminNotifyAccessRequests", true,
                "adminNotifyBankUtr", true,
                "adminNotifyRateLimitSpikes", true,
                "adminNotifyAccountDeletions", true
            );
        }
        var p = rows.get(0);
        return Map.of(
            "citationStyle", AuthSupport.first(p.get("citation_style"), "APA 7th"),
            "readerTheme", AuthSupport.first(p.get("reader_theme"), "light"),
            "readerFontScale", p.get("reader_font_scale") != null ? AuthSupport.number(p.get("reader_font_scale")) : 100,
            "notifyNewReleases", p.get("notify_new_releases") == null || AuthSupport.bool(p.get("notify_new_releases")),
            "notifyExpiryReminders", p.get("notify_expiry_reminders") == null || AuthSupport.bool(p.get("notify_expiry_reminders")),
            "notifySecurityAlerts", p.get("notify_security_alerts") == null || AuthSupport.bool(p.get("notify_security_alerts")),
            "adminNotifyAccessRequests", p.get("admin_notify_access_requests") == null || AuthSupport.bool(p.get("admin_notify_access_requests")),
            "adminNotifyBankUtr", p.get("admin_notify_bank_utr") == null || AuthSupport.bool(p.get("admin_notify_bank_utr")),
            "adminNotifyRateLimitSpikes", p.get("admin_notify_rate_limit_spikes") == null || AuthSupport.bool(p.get("admin_notify_rate_limit_spikes")),
            "adminNotifyAccountDeletions", p.get("admin_notify_account_deletions") == null || AuthSupport.bool(p.get("admin_notify_account_deletions"))
        );
    }

    @PutMapping("/preferences")
    Map<String, Object> updatePreferences(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Map<String, Object> user = auth.requireUser(request);
        long userId = AuthSupport.number(user.get("id"));

        String citationStyle = AuthSupport.str(body.getOrDefault("citationStyle", "APA 7th"));
        String readerTheme = AuthSupport.str(body.getOrDefault("readerTheme", "light"));
        long readerFontScale = body.get("readerFontScale") != null ? AuthSupport.number(body.get("readerFontScale")) : 100;
        boolean notifyNewReleases = body.get("notifyNewReleases") == null || AuthSupport.bool(body.get("notifyNewReleases"));
        boolean notifyExpiryReminders = body.get("notifyExpiryReminders") == null || AuthSupport.bool(body.get("notifyExpiryReminders"));
        boolean notifySecurityAlerts = body.get("notifySecurityAlerts") == null || AuthSupport.bool(body.get("notifySecurityAlerts"));
        boolean adminNotifyAccessRequests = body.get("adminNotifyAccessRequests") == null || AuthSupport.bool(body.get("adminNotifyAccessRequests"));
        boolean adminNotifyBankUtr = body.get("adminNotifyBankUtr") == null || AuthSupport.bool(body.get("adminNotifyBankUtr"));
        boolean adminNotifyRateLimitSpikes = body.get("adminNotifyRateLimitSpikes") == null || AuthSupport.bool(body.get("adminNotifyRateLimitSpikes"));
        boolean adminNotifyAccountDeletions = body.get("adminNotifyAccountDeletions") == null || AuthSupport.bool(body.get("adminNotifyAccountDeletions"));

        jdbc.update("""
                INSERT INTO user_preferences (
                    user_id, citation_style, reader_theme, reader_font_scale,
                    notify_new_releases, notify_expiry_reminders, notify_security_alerts,
                    admin_notify_access_requests, admin_notify_bank_utr, admin_notify_rate_limit_spikes, admin_notify_account_deletions,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                    citation_style = VALUES(citation_style),
                    reader_theme = VALUES(reader_theme),
                    reader_font_scale = VALUES(reader_font_scale),
                    notify_new_releases = VALUES(notify_new_releases),
                    notify_expiry_reminders = VALUES(notify_expiry_reminders),
                    notify_security_alerts = VALUES(notify_security_alerts),
                    admin_notify_access_requests = VALUES(admin_notify_access_requests),
                    admin_notify_bank_utr = VALUES(admin_notify_bank_utr),
                    admin_notify_rate_limit_spikes = VALUES(admin_notify_rate_limit_spikes),
                    admin_notify_account_deletions = VALUES(admin_notify_account_deletions),
                    updated_at = NOW()
                """,
                userId, citationStyle, readerTheme, readerFontScale,
                notifyNewReleases, notifyExpiryReminders, notifySecurityAlerts,
                adminNotifyAccessRequests, adminNotifyBankUtr, adminNotifyRateLimitSpikes, adminNotifyAccountDeletions
        );

        return getPreferences(request);
    }

    @GetMapping("/sessions")
    Map<String, Object> getActiveSessions(HttpServletRequest request) {
        Map<String, Object> user = auth.requireUser(request);
        long userId = AuthSupport.number(user.get("id"));
        String email = AuthSupport.str(user.get("email"));

        // Purge obsolete sessions that have passed 30 days retention window
        try {
            jdbc.update("DELETE FROM trusted_devices WHERE expires_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)");
        } catch (Exception ignored) {}

        var devices = jdbc.queryForList("""
                SELECT id, device_token, device_name, browser, operating_system, ip_address, trusted_at, expires_at, is_trusted
                FROM trusted_devices
                WHERE user_id = ? OR LOWER(email) = LOWER(?)
                ORDER BY trusted_at DESC
                """, userId, email);

        String clientProvidedIp = request.getHeader("X-Client-IP");
        String currentIp = AuthSupport.getClientIp(request, clientProvidedIp);
        return Map.of(
            "currentIp", currentIp,
            "sessionTokenVersion", user.get("session_token_version") != null ? user.get("session_token_version") : 1,
            "devices", devices
        );
    }

    @PostMapping("/sessions/revoke-others")
    Map<String, Object> revokeOtherSessions(HttpServletRequest request, @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> user = auth.requireUser(request);
        long userId = AuthSupport.number(user.get("id"));
        String email = AuthSupport.str(user.get("email"));
        String currentToken = body != null ? AuthSupport.str(body.get("currentDeviceToken")) : "";

        // Increment version to invalidate all other JWTs
        jdbc.update("UPDATE users SET session_token_version = session_token_version + 1 WHERE id = ?", userId);

        // Delete all devices except current if provided
        if (!currentToken.isBlank()) {
            jdbc.update("DELETE FROM trusted_devices WHERE (user_id = ? OR LOWER(email) = LOWER(?)) AND device_token != ?", userId, email, currentToken);
        } else {
            jdbc.update("DELETE FROM trusted_devices WHERE user_id = ? OR LOWER(email) = LOWER(?)", userId, email);
        }

        // Fetch refreshed user and issue fresh token for current session
        Map<String, Object> refreshed = auth.sanitizeUser(auth.findUserById(userId));
        String newToken = auth.signToken(refreshed);

        // Audit log
        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'WARN', 'SESSIONS_REVOKED', ?, 'User revoked all other active sessions and trusted devices.', ?, 'SUCCESS')
                    """, email, request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of(
            "message", "All other active sessions and trusted devices have been revoked.",
            "token", newToken,
            "user", refreshed
        );
    }

    @DeleteMapping("/sessions/devices/{deviceId}")
    Map<String, Object> revokeDeviceSession(HttpServletRequest request, @PathVariable("deviceId") long deviceId) {
        Map<String, Object> user = auth.requireUser(request);
        long userId = AuthSupport.number(user.get("id"));
        String email = AuthSupport.str(user.get("email")).trim().toLowerCase();

        var rows = jdbc.queryForList("SELECT * FROM trusted_devices WHERE id = ? AND (user_id = ? OR LOWER(email) = ?)", deviceId, userId, email);
        if (rows.isEmpty()) {
            // Also check if admin is revoking or user is resolving by ID
            rows = jdbc.queryForList("SELECT * FROM trusted_devices WHERE id = ?", deviceId);
            if (rows.isEmpty()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "Device session not found or already removed.");
            }
            // Verify ownership if not primary admin
            var row = rows.get(0);
            long rowUserId = row.get("user_id") != null ? AuthSupport.number(row.get("user_id")) : -1;
            String rowEmail = AuthSupport.str(row.get("email")).trim().toLowerCase();
            if (rowUserId != userId && !rowEmail.equalsIgnoreCase(email) && !Boolean.TRUE.equals(user.get("isPrimaryAdmin"))) {
                throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission to revoke this device session.");
            }
        }

        jdbc.update("DELETE FROM trusted_devices WHERE id = ?", deviceId);

        try {
            jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'AUTH-SERVICE', 'INFO', 'DEVICE_REVOKED', ?, 'User revoked trusted device session ID: %d', ?, 'SUCCESS')
                    """.formatted(deviceId), email, request.getRemoteAddr());
        } catch (Exception ignored) {}

        return Map.of("message", "Device session successfully revoked.", "success", true);
    }

    @GetMapping("/admin-activity-metrics")
    Map<String, Object> getAdminActivityMetrics(HttpServletRequest request) {
        Map<String, Object> admin = auth.requireAdmin(request);
        String adminEmail = AuthSupport.str(admin.get("email"));

        // 1. Actions Executed This Month (queries system_logs for this admin email or general admin actions this month)
        Long actionsThisMonth = 0L;
        try {
            actionsThisMonth = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM system_logs
                    WHERE (actor_email = ? OR service = 'ADMIN-PORTAL')
                      AND timestamp >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
                    """, Long.class, adminEmail);
        } catch (Exception ignored) {}

        // 2. Feedback Resolution Count (feedback with admin_response NOT NULL in zyndex_content.feedback)
        Long resolvedFeedbackCount = 0L;
        Long totalFeedbackCount = 0L;
        try {
            resolvedFeedbackCount = jdbc.queryForObject("SELECT COUNT(*) FROM zyndex_content.feedback WHERE admin_response IS NOT NULL AND TRIM(admin_response) != ''", Long.class);
            totalFeedbackCount = jdbc.queryForObject("SELECT COUNT(*) FROM zyndex_content.feedback", Long.class);
        } catch (Exception ignored) {}

        double resolutionRate = (totalFeedbackCount != null && totalFeedbackCount > 0)
                ? Math.round(((double) (resolvedFeedbackCount != null ? resolvedFeedbackCount : 0) / totalFeedbackCount) * 100.0)
                : 100.0;

        // 3. Content Curated (count of resources in zyndex_content.resources)
        Long contentCurated = 0L;
        try {
            contentCurated = jdbc.queryForObject("SELECT COUNT(*) FROM zyndex_content.resources", Long.class);
        } catch (Exception ignored) {}

        return Map.of(
            "actionsThisMonth", actionsThisMonth != null ? actionsThisMonth : 0,
            "resolvedFeedbackCount", resolvedFeedbackCount != null ? resolvedFeedbackCount : 0,
            "totalFeedbackCount", totalFeedbackCount != null ? totalFeedbackCount : 0,
            "resolutionRate", resolutionRate,
            "contentCurated", contentCurated != null ? contentCurated : 0
        );
    }

    static class AvatarForm {
        public MultipartFile avatar;
    }
}
