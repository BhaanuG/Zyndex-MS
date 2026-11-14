package com.zyndex.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;

@Component
public class AuthSupport {
    public final JdbcTemplate jdbc;
    public final AppProperties properties;
    public final org.springframework.web.client.RestTemplate restTemplate;
    public final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthSupport(JdbcTemplate jdbc, AppProperties properties, org.springframework.web.client.RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public static String getClientIp(HttpServletRequest request) {
        return getClientIp(request, null);
    }

    public static String getClientIp(HttpServletRequest request, String clientProvidedIp) {
        // If client provided a valid non-loopback IP, prioritize it
        if (clientProvidedIp != null && !clientProvidedIp.isBlank()) {
            String clean = clientProvidedIp.trim();
            if (!"0:0:0:0:0:0:0:1".equals(clean) && !"::1".equals(clean) && !"127.0.0.1".equals(clean) && !"localhost".equalsIgnoreCase(clean)) {
                return clean;
            }
        }

        if (request == null) return "127.0.0.1";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("CF-Connecting-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("True-Client-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        } else if (ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        if (ip == null || ip.isBlank()) {
            return "127.0.0.1";
        }
        // Normalize IPv6 loopback addresses to clear, readable IPv4 loopback
        if ("0:0:0:0:0:0:0:1".equals(ip.trim()) || "::1".equals(ip.trim())) {
            return "127.0.0.1";
        }
        return ip.trim();
    }

    public Map<String, Object> findUserByEmail(String email) {
        var rows = jdbc.queryForList("SELECT * FROM users WHERE email = ? LIMIT 1", email);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> findUserById(long id) {
        var rows = jdbc.queryForList("SELECT * FROM users WHERE id = ? LIMIT 1", id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public boolean isMaintenanceMode() {
        try {
            var rows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_MODE' LIMIT 1");
            if (rows.isEmpty() || !"true".equalsIgnoreCase(String.valueOf(rows.get(0).get("setting_value")))) {
                return false;
            }

            // Check if 15-minute countdown is active
            var timeRows = jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key = 'MAINTENANCE_SCHEDULED_AT' LIMIT 1");
            if (!timeRows.isEmpty() && timeRows.get(0).get("setting_value") != null) {
                String schedStr = String.valueOf(timeRows.get(0).get("setting_value"));
                try {
                    java.time.Instant scheduledInstant = java.time.Instant.parse(schedStr);
                    long elapsedSeconds = java.time.Duration.between(scheduledInstant, java.time.Instant.now()).getSeconds();
                    // If still within 15-minute window, maintenance is NOT officially blocking logins yet
                    if (elapsedSeconds < 15 * 60) {
                        return false;
                    }
                } catch (Exception ignored) {}
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public void logSystemEvent(String service, String level, String action, String actorEmail, String details, String ipAddress, String status) {
        try {
            jdbc.update(
                "INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status) " +
                "VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)",
                service != null ? service : "SYSTEM",
                level != null ? level.toUpperCase() : "INFO",
                action != null ? action : "EVENT",
                actorEmail,
                details,
                ipAddress != null ? ipAddress : "127.0.0.1",
                status != null ? status : "SUCCESS"
            );
        } catch (Exception e) {
            System.err.println("Failed to insert system log: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> updateUserSubscription(long userId, String plan, int durationDays) {
        if (plan == null || plan.isBlank()) return Map.of("notificationEmailSent", false);
        String planId = plan.toUpperCase();
        int days = durationDays > 0 ? durationDays : ("FREE".equals(planId) ? 36500 : 30);

        // Attempt 1 & 2 via subscription-service
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String url = "http://subscription-service/api/subscriptions/admin/sync";
                Map<String, Object> req = Map.of(
                    "userId", userId,
                    "plan", planId,
                    "durationDays", days
                );
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.set("X-Internal-Service", "auth-service");
                org.springframework.http.HttpEntity<Map<String, Object>> entity =
                        new org.springframework.http.HttpEntity<>(req, headers);
                Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
                if (response != null) return response;
            } catch (Exception e) {
                if (attempt == 1) {
                    try { Thread.sleep(150); } catch (InterruptedException ignored) {}
                }
            }
        }

        // Resilient Fallback: Synchronize directly into shared database tables so user plan change NEVER fails
        try {
            jdbc.update("UPDATE zyndex_subscription.subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);
            String subscriptionId = "ADMIN_SYNC_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 14);
            java.sql.Timestamp nowTs = new java.sql.Timestamp(System.currentTimeMillis());
            java.sql.Timestamp endTs = new java.sql.Timestamp(System.currentTimeMillis() + (long) days * 24L * 60L * 60L * 1000L);
            jdbc.update(
                    "INSERT INTO zyndex_subscription.subscriptions (id, user_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, 'ACTIVE', ?, ?, FALSE)",
                    subscriptionId, userId, planId, nowTs, endTs);
            return Map.of("message", "Subscription synchronized directly.", "notificationEmailSent", true);
        } catch (Exception fallbackErr) {
            try {
                jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);
                String subscriptionId = "ADMIN_SYNC_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 14);
                java.sql.Timestamp nowTs = new java.sql.Timestamp(System.currentTimeMillis());
                java.sql.Timestamp endTs = new java.sql.Timestamp(System.currentTimeMillis() + (long) days * 24L * 60L * 60L * 1000L);
                jdbc.update(
                        "INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, 'ACTIVE', ?, ?, FALSE)",
                        subscriptionId, userId, planId, nowTs, endTs);
                return Map.of("message", "Subscription synchronized directly.", "notificationEmailSent", true);
            } catch (Exception fatal) {
                throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Subscription update could not be synchronized. Please try again.");
            }
        }
    }

    public Map<String, Object> user(HttpServletRequest request) {
        try {
            return requireUser(request);
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> requireUser(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        String headerId = request.getHeader("X-User-Id");

        // Resolve token claims if Bearer header exists to check session token version
        Claims tokenClaims = null;
        if (header != null && header.startsWith("Bearer ")) {
            try {
                tokenClaims = Jwts.parser().verifyWith(secretKey()).build().parseSignedClaims(header.substring(7)).getPayload();
            } catch (Exception ignored) {}
        }

        long userId = -1;
        if (headerId != null && !headerId.isBlank()) {
            try {
                userId = Long.parseLong(headerId);
            } catch (Exception ignored) {}
        } else if (tokenClaims != null && tokenClaims.getSubject() != null) {
            try {
                userId = Long.parseLong(String.valueOf(tokenClaims.getSubject()));
            } catch (Exception ignored) {}
        }

        if (userId <= 0) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        Map<String, Object> user = findUserById(userId);
        if (user == null || !Boolean.TRUE.equals(bool(user.get("active")))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or inactive account.");
        }
        if (Boolean.TRUE.equals(bool(user.get("terminated")))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your session was terminated by an administrator. Please contact administrator.");
        }

        // Validate maintenance mode first: if platform is in maintenance mode, non-primary admins must receive the maintenance notification
        Map<String, Object> sanitized = sanitizeUser(user);
        if (isMaintenanceMode() && !Boolean.TRUE.equals(sanitized.get("isPrimaryAdmin"))) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "The platform is currently under scheduled maintenance mode. Kindly check back later or contact the main administrator.");
        }

        // Validate session token version against DB version to terminate superseded / force-logged-out sessions
        String userEmail = str(user.get("email"));

        if (tokenClaims != null) {
            Object tokenVer = tokenClaims.get("v");
            if (tokenVer != null) {
                int claimV = Integer.parseInt(String.valueOf(tokenVer));
                int dbV = user.get("session_token_version") != null ? (int) number(user.get("session_token_version")) : 1;
                if (claimV < dbV) {
                    String invalidationReason = str(user.get("session_invalidation_reason"));
                    if ("MIDNIGHT_DAILY_RESET".equalsIgnoreCase(invalidationReason)) {
                        throw new ApiException(HttpStatus.UNAUTHORIZED, "DAILY_SESSION_EXPIRED", "Your 24-hour daily session has ended at 12:00 AM IST (midnight reset). Please log in again to continue.");
                    } else if ("ADMIN_TERMINATED".equalsIgnoreCase(invalidationReason) || "ADMIN_FORCE_LOGOUT_ALL".equalsIgnoreCase(invalidationReason)) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "ADMIN_TERMINATED", "Your session was terminated by an administrator. Please authenticate again when ready.");
                    } else if ("ROLE_CHANGED".equalsIgnoreCase(invalidationReason)) {
                        throw new ApiException(HttpStatus.UNAUTHORIZED, "ROLE_CHANGED", "Your platform role or permissions have been updated by an administrator. Please log in again to apply your new access tier.");
                    } else if ("MAINTENANCE_ACTIVE".equalsIgnoreCase(invalidationReason)) {
                        throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "MAINTENANCE_ACTIVE", "The platform is currently under scheduled maintenance mode. Kindly check back later or contact the main administrator.");
                    } else if ("USER_REVOKED_OTHER_SESSIONS".equalsIgnoreCase(invalidationReason)) {
                        throw new ApiException(HttpStatus.UNAUTHORIZED, "SESSION_REVOKED", "This session was revoked from your active devices management settings. Please log in again.");
                    } else {
                        throw new ApiException(HttpStatus.UNAUTHORIZED, "SUPERSEDED_BY_NEW_LOGIN", "The session for " + userEmail + " is currently logged in on another device. If you want to continue on this device, please log in again. If this was not done by you, please change your password immediately to protect your account.");
                    }
                }
            }
        }

        return sanitized;
    }

    public void requireRole(Map<String, Object> user, String role) {
        if (!role.equalsIgnoreCase(str(user.get("role")))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this resource.");
        }
    }

    public Map<String, Object> requireAdmin(HttpServletRequest request) {
        Map<String, Object> user = requireUser(request);
        requireRole(user, "admin");
        return user;
    }

    public Map<String, Object> requirePrimaryAdmin(HttpServletRequest request) {
        Map<String, Object> user = requireUser(request);
        requireRole(user, "admin");
        if (!Boolean.TRUE.equals(user.get("isPrimaryAdmin"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the primary administrator can modify users or content.");
        }
        return user;
    }

    public String signToken(Map<String, Object> user) {
        Instant now = Instant.now();
        String role = "ADMIN".equalsIgnoreCase(str(user.get("role"))) ? "admin" : "user";
        int version = user.get("session_token_version") != null ? (int) number(user.get("session_token_version")) : 1;
        return Jwts.builder()
                .subject(String.valueOf(user.get("id")))
                .claim("role", role)
                .claim("email", user.get("email"))
                .claim("name", first(user.get("name"), user.get("username")))
                .claim("v", version)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(150 * 60))) // 2 hours 30 minutes (150 mins) JWT lifetime per policy
                .signWith(secretKey())
                .compact();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> sanitizeUser(Map<String, Object> row) {
        Map<String, Object> user = new LinkedHashMap<>();
        String email = str(row.get("email"));
        String role = "ADMIN".equalsIgnoreCase(str(row.get("role"))) ? "admin" : "user";
        long id = number(row.get("id"));
        user.put("id", id);
        user.put("name", first(row.get("name"), row.get("username")));
        user.put("email", email);
        user.put("role", role);
        user.put("isPrimaryAdmin", email.equalsIgnoreCase(properties.mainAdminEmail()));
        user.put("bio", first(row.get("bio"), ""));
        user.put("registrationNo", first(row.get("registration_no"), ""));
        user.put("userType", first(row.get("user_type"), "Other"));
        user.put("profession", first(row.get("profession"), ""));
        user.put("collegeName", first(row.get("college_name"), ""));
        user.put("universityName", first(row.get("university_name"), ""));
        user.put("active", row.get("active") == null ? true : bool(row.get("active")));
        user.put("terminated", bool(row.get("is_terminated")));
        user.put("session_token_version", row.get("session_token_version") != null ? number(row.get("session_token_version")) : 1);
        user.put("createdAt", row.get("created_at"));
        user.put("updatedAt", row.get("updated_at"));

        // Fetch active plan subscription directly from database with zero latency
        user.put("subscriptionPlan", "FREE");
        user.put("subscriptionExpiresAt", null);
        boolean planResolved = false;

        // 1. Direct query against subscriptions table (supports both zyndex_subscription schema and zyndex_db fallback)
        try {
            java.util.List<Map<String, Object>> subs = jdbc.queryForList(
                    "SELECT plan_id, end_date FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
                    id);
            if (subs.isEmpty()) {
                subs = jdbc.queryForList(
                        "SELECT plan_id, end_date FROM zyndex_subscription.subscriptions WHERE user_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
                        id);
            }
            if (!subs.isEmpty()) {
                Map<String, Object> sub = subs.get(0);
                String planId = str(sub.get("plan_id"));
                Object endDate = sub.get("end_date");
                boolean isExpired = false;
                if (endDate != null) {
                    try {
                        java.time.Instant expInstant = null;
                        if (endDate instanceof java.sql.Timestamp) {
                            expInstant = ((java.sql.Timestamp) endDate).toInstant();
                        } else if (endDate instanceof java.time.LocalDateTime) {
                            expInstant = ((java.time.LocalDateTime) endDate).toInstant(java.time.ZoneOffset.UTC);
                        } else if (endDate instanceof java.time.Instant) {
                            expInstant = (java.time.Instant) endDate;
                        } else {
                            String expiryText = String.valueOf(endDate);
                            try {
                                expInstant = java.time.Instant.parse(expiryText);
                            } catch (java.time.format.DateTimeParseException ignored) {
                                expInstant = java.time.LocalDateTime.parse(expiryText.replace(' ', 'T'))
                                        .toInstant(java.time.ZoneOffset.UTC);
                            }
                        }
                        if (expInstant != null && java.time.Instant.now().isAfter(expInstant)) {
                            isExpired = true;
                        }
                    } catch (Exception ignored) {}
                }
                if (!isExpired && !planId.isBlank()) {
                    user.put("subscriptionPlan", planId);
                    user.put("subscriptionExpiresAt", endDate);
                    planResolved = true;
                }
            }
        } catch (Exception ignored) {}

        // 2. Fallback to access_entitlements if not found in subscriptions table
        if (!planResolved) {
            try {
                java.util.List<Map<String, Object>> entRows = jdbc.queryForList(
                        "SELECT permission, expires_at FROM access_entitlements WHERE user_id = ? AND (resource_id IS NULL OR resource_id = 0) AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1",
                        id);
                if (!entRows.isEmpty()) {
                    Map<String, Object> ent = entRows.get(0);
                    String permission = str(ent.get("permission"));
                    Object expObj = ent.get("expires_at");
                    boolean isExpired = false;
                    if (expObj != null) {
                        try {
                            java.time.Instant expInstant = null;
                            if (expObj instanceof java.sql.Timestamp) {
                                expInstant = ((java.sql.Timestamp) expObj).toInstant();
                            } else if (expObj instanceof java.time.LocalDateTime) {
                                expInstant = ((java.time.LocalDateTime) expObj).toInstant(java.time.ZoneOffset.UTC);
                            } else if (expObj instanceof java.time.Instant) {
                                expInstant = (java.time.Instant) expObj;
                            } else {
                                String expiryText = String.valueOf(expObj);
                                try {
                                    expInstant = java.time.Instant.parse(expiryText);
                                } catch (java.time.format.DateTimeParseException ignored) {
                                    expInstant = java.time.LocalDateTime.parse(expiryText.replace(' ', 'T'))
                                            .toInstant(java.time.ZoneOffset.UTC);
                                }
                            }
                            if (expInstant != null && java.time.Instant.now().isAfter(expInstant)) {
                                isExpired = true;
                            }
                        } catch (Exception ignored) {}
                    }
                    if (!isExpired && !permission.isBlank()) {
                        user.put("subscriptionPlan", permission);
                        user.put("subscriptionExpiresAt", expObj);
                        planResolved = true;
                    }
                }
            } catch (Exception ignored) {}
        }

        // 3. Fallback via REST access-service if needed
        if (!planResolved) {
            try {
                String accessUrl = "http://access-service/api/access/entitlements/user/" + id;
                java.util.List<Map<String, Object>> entitlements = restTemplate.getForObject(accessUrl, java.util.List.class);
                if (entitlements != null) {
                    for (Map<String, Object> entitlement : entitlements) {
                        long resId = entitlement.get("resource_id") != null ? ((Number) entitlement.get("resource_id")).longValue() : 0;
                        String status = String.valueOf(entitlement.get("status"));
                        if (resId == 0 && "ACTIVE".equalsIgnoreCase(status)) {
                            Object expObj = entitlement.get("expires_at");
                            boolean isExpired = false;
                            if (expObj != null) {
                                try {
                                    java.time.Instant expInstant = null;
                                    if (expObj instanceof java.sql.Timestamp) {
                                        expInstant = ((java.sql.Timestamp) expObj).toInstant();
                                    } else if (expObj instanceof java.time.LocalDateTime) {
                                        expInstant = ((java.time.LocalDateTime) expObj).toInstant(java.time.ZoneOffset.UTC);
                                    } else if (expObj instanceof java.time.Instant) {
                                        expInstant = (java.time.Instant) expObj;
                                    } else {
                                        String expiryText = String.valueOf(expObj);
                                        try {
                                            expInstant = java.time.Instant.parse(expiryText);
                                        } catch (java.time.format.DateTimeParseException ignored) {
                                            expInstant = java.time.LocalDateTime.parse(expiryText.replace(' ', 'T'))
                                                    .toInstant(java.time.ZoneOffset.UTC);
                                        }
                                    }
                                    if (expInstant != null && java.time.Instant.now().isAfter(expInstant)) {
                                        isExpired = true;
                                    }
                                } catch (Exception ignored) {}
                            }
                            if (!isExpired) {
                                user.put("subscriptionPlan", entitlement.get("permission"));
                                user.put("subscriptionExpiresAt", entitlement.get("expires_at"));
                                break;
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        return user;
    }

    private SecretKey secretKey() {
        byte[] seed = properties.jwtSecret().getBytes(StandardCharsets.UTF_8);
        byte[] key = new byte[Math.max(32, seed.length)];
        System.arraycopy(seed, 0, key, 0, seed.length);
        return Keys.hmacShaKeyFor(key);
    }

    public static boolean isValidEmail(String email) {
        return email != null && email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    }

    public static Object first(Object value, Object fallback) {
        if (value == null) {
            return fallback;
        }
        if (value instanceof String text && text.isBlank()) {
            return fallback;
        }
        return value;
    }

    public static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    public static long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    public static Boolean bool(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() != 0;
        }
        return Boolean.parseBoolean(String.valueOf(value));
    }

    public boolean verifyUniversity(String name) {
        try {
            String encodedName = URLEncoder.encode(name.trim(), StandardCharsets.UTF_8);
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://universities.hipolabs.com/search?name=" + encodedName))
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            return body != null && !body.trim().equals("[]") && body.trim().length() > 2;
        } catch (Exception e) {
            System.err.println("Verification failed: " + e.getMessage());
            return true; // Fallback to true if external service is down, preventing blockages
        }
    }

    public void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters long.");
        }
        boolean hasUppercase = false;
        boolean hasDigit = false;
        boolean hasSpecialChar = false;
        
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) {
                hasUppercase = true;
            } else if (Character.isDigit(c)) {
                hasDigit = true;
            } else if (!Character.isLetterOrDigit(c) && !Character.isWhitespace(c)) {
                hasSpecialChar = true;
            }
        }
        
        if (!hasUppercase) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain at least one uppercase letter.");
        }
        if (!hasDigit) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain at least one digit.");
        }
        if (!hasSpecialChar) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Password must contain at least one special character.");
        }
    }
}
