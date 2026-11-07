package com.zyndex.auth;

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
    private final JdbcTemplate jdbc;
    private final AppProperties properties;
    private final org.springframework.web.client.RestTemplate restTemplate;
    public final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthSupport(JdbcTemplate jdbc, AppProperties properties, org.springframework.web.client.RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    public Map<String, Object> findUserByEmail(String email) {
        var rows = jdbc.queryForList("SELECT * FROM users WHERE email = ? LIMIT 1", email);
        return rows.isEmpty() ? null : rows.get(0);
    }

    public Map<String, Object> findUserById(long id) {
        var rows = jdbc.queryForList("SELECT * FROM users WHERE id = ? LIMIT 1", id);
        return rows.isEmpty() ? null : rows.get(0);
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
        try {
            String url = "http://subscription-service/api/subscriptions/admin/sync";
            Map<String, Object> req = Map.of(
                "userId", userId,
                "plan", plan.toUpperCase(),
                "durationDays", durationDays > 0 ? durationDays : 30
            );
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Service", "auth-service");
            org.springframework.http.HttpEntity<Map<String, Object>> entity =
                    new org.springframework.http.HttpEntity<>(req, headers);
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
            return response == null ? Map.of("notificationEmailSent", false) : response;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Subscription update could not be synchronized. Please try again.");
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
        // First check headers injected by the API Gateway
        String headerId = request.getHeader("X-User-Id");
        if (headerId != null && !headerId.isBlank()) {
            Map<String, Object> user = findUserById(Long.parseLong(headerId));
            if (user == null || !Boolean.TRUE.equals(bool(user.get("active")))) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or inactive account.");
            }
            return sanitizeUser(user);
        }

        // Direct fallback: check token in header (e.g. for internal requests or testing)
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        try {
            var claims = Jwts.parser().verifyWith(secretKey()).build().parseSignedClaims(header.substring(7)).getPayload();
            Map<String, Object> user = findUserById(Long.parseLong(String.valueOf(claims.getSubject())));
            if (user == null || !Boolean.TRUE.equals(bool(user.get("active")))) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or inactive account.");
            }
            // Check session token version if present in claims
            Object tokenVer = claims.get("v");
            if (tokenVer != null) {
                int claimV = Integer.parseInt(String.valueOf(tokenVer));
                int dbV = user.get("session_token_version") != null ? number(user.get("session_token_version")).intValue() : 1;
                if (claimV < dbV) {
                    throw new ApiException(HttpStatus.UNAUTHORIZED, "Your session has been terminated by administrator. Please log in again.");
                }
            }
            return sanitizeUser(user);
        } catch (ApiException error) {
            throw error;
        } catch (Exception error) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid authentication token.");
        }
    }

    public void requireRole(Map<String, Object> user, String role) {
        if (!role.equalsIgnoreCase(str(user.get("role")))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access to this resource.");
        }
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
        int version = user.get("session_token_version") != null ? number(user.get("session_token_version")).intValue() : 1;
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
        user.put("active", bool(row.get("active")));
        user.put("createdAt", row.get("created_at"));
        user.put("updatedAt", row.get("updated_at"));

        // Fetch active plan subscription from access-service
        user.put("subscriptionPlan", "FREE");
        user.put("subscriptionExpiresAt", null);
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
        } catch (Exception e) {
            System.err.println("Failed to fetch entitlements in sanitizeUser: " + e.getMessage());
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
            return true;
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
