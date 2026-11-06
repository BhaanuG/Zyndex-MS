package com.zyndex.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
class UserController {
    private final JdbcTemplate jdbc;
    private final AuthSupport auth;
    private final SqlSupport sql;
    private final AccountEmailService accountEmailService;

    UserController(JdbcTemplate jdbc, AuthSupport auth, SqlSupport sql, AccountEmailService accountEmailService) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.sql = sql;
        this.accountEmailService = accountEmailService;
    }

    @GetMapping("/{userId}/profile")
    Map<String, Object> profile(HttpServletRequest request, @PathVariable("userId") String userId) {
        if ("subscription-service".equalsIgnoreCase(request.getHeader("X-Internal-Service"))) {
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
        auth.requirePrimaryAdmin(request);
        var page = sql.page(query);
        String search = "%" + AuthSupport.str(query.get("search")) + "%";
        var rows = jdbc.queryForList("SELECT * FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                search, search, page.get("size"), page.get("offset"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE username LIKE ? OR email LIKE ?", Long.class, search, search);
        return sql.pageResult("users", rows.stream().map(row -> {
            Map<String, Object> sanitized = auth.sanitizeUser(row);
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
        auth.requirePrimaryAdmin(request);
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
        jdbc.update("INSERT INTO users (created_at, email, password, username, role, user_type, profession, college_name, university_name, registration_no, bio) VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            email, auth.passwordEncoder.encode(password), name, "admin".equals(body.get("role")) ? "ADMIN" : "STUDENT", userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio);
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
        auth.requirePrimaryAdmin(request);
        Map<String, Object> subscriptionUpdate = Map.of("notificationEmailSent", false);
        String name = AuthSupport.str(body.get("name"));
        String email = AuthSupport.str(body.get("email"));
        String role = "admin".equals(body.get("role")) ? "ADMIN" : "STUDENT";
        String password = AuthSupport.str(body.get("password"));
        String userType = AuthSupport.str(body.get("userType"));
        String profession = AuthSupport.str(body.get("profession"));
        String collegeName = AuthSupport.str(body.get("collegeName"));
        String universityName = AuthSupport.str(body.get("universityName"));
        String registrationNo = AuthSupport.str(body.get("registrationNo"));
        String bio = AuthSupport.str(body.get("bio"));

        if (body.containsKey("subscriptionPlan")) {
            String subscriptionPlan = AuthSupport.str(body.get("subscriptionPlan"));
            int durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;
            if (!subscriptionPlan.isBlank()) {
                subscriptionUpdate = auth.updateUserSubscription(userId, subscriptionPlan, durationDays);
            }
        }

        if (password.isBlank()) {
            jdbc.update("UPDATE users SET username = ?, email = ?, role = ?, user_type = ?, profession = ?, college_name = ?, university_name = ?, registration_no = ?, bio = ? WHERE id = ?", name, email, role, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio, userId);
        } else {
            jdbc.update("UPDATE users SET username = ?, email = ?, role = ?, user_type = ?, profession = ?, college_name = ?, university_name = ?, registration_no = ?, bio = ?, password = ? WHERE id = ?", name, email, role, userType.isBlank() ? "Other" : userType, profession.isBlank() ? null : profession, collegeName.isBlank() ? null : collegeName, universityName.isBlank() ? null : universityName, registrationNo.isBlank() ? null : registrationNo, bio.isBlank() ? null : bio, auth.passwordEncoder.encode(password), userId);
        }

        boolean notificationEmailSent = password.isBlank() || accountEmailService.sendPasswordChangedEmail(name, email);
        return Map.of("message", "User updated successfully.",
            "notificationEmailSent", subscriptionUpdate.getOrDefault("notificationEmailSent", notificationEmailSent));
    }

    @PutMapping("/{userId}/role")
    Map<String, Object> updateRole(HttpServletRequest request, @PathVariable("userId") long userId, @RequestBody Map<String, Object> body) {
        auth.requirePrimaryAdmin(request);
        jdbc.update("UPDATE users SET role = ? WHERE id = ?", "admin".equals(body.get("role")) ? "ADMIN" : "STUDENT", userId);
        return Map.of("message", "User role updated successfully.");
    }

    @PutMapping("/{userId}/status")
    Map<String, Object> updateStatus(HttpServletRequest request, @PathVariable("userId") long userId, @RequestBody Map<String, Object> body) {
        auth.requirePrimaryAdmin(request);
        boolean active = AuthSupport.bool(body.get("active"));
        jdbc.update("UPDATE users SET active = ? WHERE id = ?", active, userId);
        return Map.of("message", "User active status updated successfully.");
    }

    @DeleteMapping("/{userId}")
    Map<String, Object> delete(HttpServletRequest request, @PathVariable("userId") long userId) {
        Map<String, Object> user = auth.requirePrimaryAdmin(request);
        if (userId == AuthSupport.number(user.get("id"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete the account you are currently logged in with.");
        }
        jdbc.update("DELETE FROM users WHERE id = ?", userId);
        return Map.of("message", "User deleted successfully.");
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
