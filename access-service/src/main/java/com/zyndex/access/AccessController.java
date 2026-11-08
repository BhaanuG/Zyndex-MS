package com.zyndex.access;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/access")
public class AccessController {

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;

    public AccessController(JdbcTemplate jdbc, RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
    }

    @GetMapping("/check")
    public Map<String, Object> check(
            @RequestParam(name = "userId", required = false) Long userId,
            @RequestParam(name = "resourceId", required = false) Long resourceId,
            @RequestParam(name = "permission", required = false, defaultValue = "READ") String permission,
            @RequestParam(name = "role", required = false) String role,
            @RequestParam(name = "category", required = false, defaultValue = "") String category,
            @RequestParam(name = "type", required = false, defaultValue = "") String type,
            @RequestParam(name = "requiredPlan", required = false, defaultValue = "FREE") String requiredPlan) {

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        // If user is admin, they are automatically authorized with full bypass
        if ("admin".equalsIgnoreCase(role)) {
            return Map.of("authorized", true);
        }

        // 1. Check if there is an active matching direct entitlement for this resource
        if (resourceId != null && resourceId > 0) {
            String directSql = """
                    SELECT COUNT(*) FROM access_entitlements
                    WHERE user_id = ?
                      AND resource_id = ?
                      AND (LOWER(permission) = LOWER(?) OR LOWER(permission) = 'all')
                      AND status = 'ACTIVE'
                      AND (expires_at IS NULL OR expires_at > NOW())
                    """;
            Integer directCount = jdbc.queryForObject(directSql, Integer.class, userId, resourceId, permission);
            if (directCount != null && directCount > 0) {
                return Map.of("authorized", true);
            }
        }

        // 2. Query user's current active global plan entitlement (permission stores plan name)
        String planSql = """
                SELECT permission FROM access_entitlements
                WHERE user_id = ?
                  AND (resource_id IS NULL OR resource_id = 0)
                  AND status = 'ACTIVE'
                  AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY id DESC LIMIT 1
                """;
        List<String> plans = jdbc.queryForList(planSql, String.class, userId);
        String activePlan = plans.isEmpty() ? "FREE" : plans.get(0).toUpperCase();

        int userTier = getPlanTier(activePlan);
        int reqTier = getPlanTier(requiredPlan);

        // 3. Check minimum required plan tier
        if (userTier < reqTier) {
            return Map.of("authorized", false, "reason",
                "This resource is locked for your current plan. It requires the " + getPlanNameByTier(reqTier) + " plan or higher. Please upgrade to unlock.");
        }

        // 4. Evaluate action-specific gating rules (e.g. downloads)
        // Downloads are strictly prohibited for user and regular admins.
        boolean isDownload = "DOWNLOAD".equalsIgnoreCase(permission);
        if (isDownload) {
            return Map.of("authorized", false, "reason",
                "Direct downloading of resources is disabled across user and administrator portals. Please use the secure online reader.");
        }

        if (userTier == 0) { // Free tier reading limits
            boolean isPublic = "Public".equalsIgnoreCase(category) || "Demo".equalsIgnoreCase(category) || "Public".equalsIgnoreCase(type) || "Demo".equalsIgnoreCase(type) || reqTier == 0;
            if (isPublic) {
                int limit = System.getenv("FREE_DAILY_READ_LIMIT") != null 
                        ? Integer.parseInt(System.getenv("FREE_DAILY_READ_LIMIT")) 
                        : 5;
                try {
                    Map<?, ?> usageStats = restTemplate.getForObject("http://usage-service/api/usage/views/user/" + userId + "/today", Map.class);
                    if (usageStats != null) {
                        int todayCount = ((Number) usageStats.get("count")).intValue();
                        List<?> viewedResourceIds = (List<?>) usageStats.get("resourceIds");
                        
                        boolean alreadyViewed = false;
                        if (resourceId != null && viewedResourceIds != null) {
                            for (Object idObj : viewedResourceIds) {
                                if (idObj != null && ((Number) idObj).longValue() == resourceId.longValue()) {
                                    alreadyViewed = true;
                                    break;
                                }
                            }
                        }
                        
                        if (todayCount >= limit && !alreadyViewed) {
                            return Map.of("authorized", false, "reason", "Daily free reading limit reached (" + limit + " documents/day). Please upgrade your plan to continue reading.");
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Failed to check daily limit from usage-service: " + e.getMessage());
                }
                return Map.of("authorized", true, "pageLimit", 10);
            } else {
                return Map.of("authorized", false, "reason", "This content requires a Student Basic or higher subscription plan.");
            }
        }

        return Map.of("authorized", true);
    }

    private int getPlanTier(String plan) {
        if (plan == null) return 0;
        String p = plan.toUpperCase().replace(" ", "_");
        if (p.contains("ENTERPRISE")) return 5;
        if (p.contains("UNIVERSITY")) return 4;
        if (p.contains("RESEARCHER") || p.contains("PHD")) return 3;
        if (p.contains("STUDENT_PLUS") || p.contains("PLUS")) return 2;
        if (p.contains("STUDENT_BASIC") || p.contains("BASIC") || p.contains("STUDENT")) return 1;
        return 0; // FREE
    }

    private String getPlanNameByTier(int tier) {
        return switch (tier) {
            case 5 -> "Enterprise / Institution";
            case 4 -> "University";
            case 3 -> "PhD Scholar / Researcher";
            case 2 -> "Student Plus";
            case 1 -> "Student Basic";
            default -> "Free / Demo";
        };
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        if (!"subscription-service".equalsIgnoreCase(request.getHeader("X-Internal-Service"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Subscription synchronization is restricted.");
        }
        Long userId = getLong(body.get("userId"));
        String plan = String.valueOf(body.getOrDefault("plan", "FREE")).toUpperCase();
        Integer durationDays = body.get("durationDays") != null ? Integer.parseInt(String.valueOf(body.get("durationDays"))) : 30;

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }
        if (!Set.of("FREE", "STUDENT_BASIC", "STUDENT_PLUS", "RESEARCHER_PRO", "UNIVERSITY", "ENTERPRISE").contains(plan)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid subscription plan.");
        }
        if (durationDays <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "durationDays must be greater than zero.");
        }
        if ("FREE".equals(plan)) {
            durationDays = 36500;
        }

        // Revoke any previous active global plan entitlements for this user
        jdbc.update("UPDATE access_entitlements SET status = 'REVOKED' WHERE user_id = ? AND (resource_id IS NULL OR resource_id = 0)", userId);

        // Grant new plan entitlement
        jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission, status, expires_at) VALUES (?, 0, ?, 'ACTIVE', DATE_ADD(NOW(), INTERVAL ? DAY))",
                userId, plan, durationDays);

        // Notify user via email
        try {
            Map<String, Object> userProfile = restTemplate.getForObject("http://auth-service/api/users/" + userId + "/profile", Map.class);
            if (userProfile != null) {
                String name = String.valueOf(userProfile.get("name"));
                String email = String.valueOf(userProfile.get("email"));
                
                double amount = 0.0;
                if (plan.contains("STUDENT_BASIC") || plan.contains("STUDENT BASIC")) {
                    amount = 99.0;
                } else if (plan.contains("STUDENT_PLUS") || plan.contains("STUDENT PLUS")) {
                    amount = 199.0;
                } else if (plan.contains("RESEARCHER_PRO") || plan.contains("RESEARCHER PRO")) {
                    amount = 399.0;
                } else if (plan.contains("UNIVERSITY")) {
                    amount = 100000.0;
                } else if (plan.contains("ENTERPRISE")) {
                    amount = 300000.0;
                }

                Map<String, Object> emailRequest = Map.of(
                    "name", name,
                    "email", email,
                    "plan", plan.replace("_", " "),
                    "amount", amount,
                    "durationDays", durationDays
                );
                restTemplate.postForObject("http://auth-service/api/users/send-subscription-email", emailRequest, Map.class);
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch user or send subscription email: " + e.getMessage());
        }

        return Map.of("message", "Subscribed to plan " + plan + " successfully.", "plan", plan, "durationDays", durationDays);
    }

    @PostMapping("/entitlements")
    public Map<String, Object> grant(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        requireAdmin(request);

        Long userId = getLong(body.get("userId"));
        Long resourceId = getLong(body.get("resourceId"));
        String permission = String.valueOf(body.getOrDefault("permission", "READ")).toUpperCase();
        String expiresAt = body.containsKey("expiresAt") ? String.valueOf(body.get("expiresAt")) : null;

        if (userId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }

        if (expiresAt != null && !expiresAt.isBlank()) {
            jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission, expires_at) VALUES (?, ?, ?, ?)",
                    userId, resourceId, permission, expiresAt);
        } else {
            jdbc.update("INSERT INTO access_entitlements (user_id, resource_id, permission) VALUES (?, ?, ?)",
                    userId, resourceId, permission);
        }

        return Map.of("message", "Entitlement granted successfully.");
    }

    @DeleteMapping("/entitlements/{id}")
    public Map<String, Object> revoke(HttpServletRequest request, @PathVariable("id") long id) {
        requireAdmin(request);

        int count = jdbc.update("UPDATE access_entitlements SET status = 'REVOKED' WHERE id = ?", id);
        if (count == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Entitlement not found.");
        }
        return Map.of("message", "Entitlement revoked successfully.");
    }

    @GetMapping("/entitlements/user/{userId}")
    public List<Map<String, Object>> listUserEntitlements(@PathVariable("userId") long userId) {
        return jdbc.queryForList("SELECT * FROM access_entitlements WHERE user_id = ? ORDER BY created_at DESC", userId);
    }

    private void requireAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (!"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    private Long getLong(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).longValue();
        try {
            return Long.parseLong(String.valueOf(obj));
        } catch (Exception e) {
            return null;
        }
    }
}
