package com.zyndex.content;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserContentController {

    private final JdbcTemplate jdbc;
    private final SqlSupport sql;
    private final RestTemplate restTemplate;

    public UserContentController(JdbcTemplate jdbc, SqlSupport sql, RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.restTemplate = restTemplate;
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/downloads")
    public Map<String, Object> downloads(HttpServletRequest request, @RequestParam Map<String, String> query) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);
        var pageParams = sql.page(query);

        // Fetch user download logs from usage-service
        String usageUrl = "http://usage-service/api/usage/downloads/user/" + userId + "?page=" + pageParams.get("page") + "&size=" + pageParams.get("size");
        Map<String, Object> usageResponse;
        try {
            usageResponse = restTemplate.getForObject(usageUrl, Map.class);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "USAGE_SERVICE_UNAVAILABLE", "Usage service is temporarily unavailable.");
        }

        List<Map<String, Object>> usageList = (List<Map<String, Object>>) usageResponse.getOrDefault("resources", List.of());
        long total = ((Number) usageResponse.getOrDefault("totalElements", 0)).longValue();

        List<Map<String, Object>> resourcesList = new ArrayList<>();
        for (Map<String, Object> usage : usageList) {
            long resourceId = SqlSupport.number(usage.get("resource_id"));
            var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", resourceId);
            if (!rows.isEmpty()) {
                Map<String, Object> resource = sql.mapResource(rows.get(0));
                resource.put("downloadedAt", usage.get("downloaded_at"));
                resourcesList.add(resource);
            }
        }

        return sql.pageResult("resources", resourcesList, total, pageParams.get("page"), pageParams.get("size"));
    }

    @GetMapping("/favorites")
    public Map<String, Object> favorites(HttpServletRequest request, @RequestParam Map<String, String> query) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);
        var pageParams = sql.page(query);

        var rows = jdbc.queryForList("""
                SELECT sr.saved_at, r.*
                FROM saved_resources sr JOIN resources r ON r.id = sr.resource_id
                WHERE sr.user_id = ? ORDER BY sr.saved_at DESC LIMIT ? OFFSET ?
                """, userId, pageParams.get("size"), pageParams.get("offset"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM saved_resources WHERE user_id = ?", Long.class, userId);

        List<Map<String, Object>> resources = rows.stream().map(row -> {
            Map<String, Object> res = sql.mapResource(row);
            res.put("addedAt", row.get("saved_at"));
            return res;
        }).toList();

        return sql.pageResult("resources", resources, total, pageParams.get("page"), pageParams.get("size"));
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/recent-views")
    public Map<String, Object> recentViews(HttpServletRequest request, @RequestParam Map<String, String> query) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);
        var pageParams = sql.page(query);

        // Fetch user view logs from usage-service
        String usageUrl = "http://usage-service/api/usage/views/user/" + userId + "?page=" + pageParams.get("page") + "&size=" + pageParams.get("size");
        Map<String, Object> usageResponse;
        try {
            usageResponse = restTemplate.getForObject(usageUrl, Map.class);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "USAGE_SERVICE_UNAVAILABLE", "Usage service is temporarily unavailable.");
        }

        List<Map<String, Object>> usageList = (List<Map<String, Object>>) usageResponse.getOrDefault("resources", List.of());
        long total = ((Number) usageResponse.getOrDefault("totalElements", 0)).longValue();

        List<Map<String, Object>> resourcesList = new ArrayList<>();
        for (Map<String, Object> usage : usageList) {
            long resourceId = SqlSupport.number(usage.get("resource_id"));
            var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", resourceId);
            if (!rows.isEmpty()) {
                Map<String, Object> resource = sql.mapResource(rows.get(0));
                resource.put("viewedAt", usage.get("viewed_at"));
                resourcesList.add(resource);
            }
        }

        return sql.pageResult("resources", resourcesList, total, pageParams.get("page"), pageParams.get("size"));
    }

    @PostMapping("/favorites/{resourceId}")
    public Map<String, Object> addFavorite(HttpServletRequest request, @PathVariable("resourceId") long resourceId) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);

        jdbc.update("INSERT IGNORE INTO saved_resources (resource_id, saved_at, user_id) VALUES (?, NOW(), ?)", resourceId, userId);
        return Map.of("message", "Resource added to favorites.");
    }

    @DeleteMapping("/favorites/{resourceId}")
    public Map<String, Object> removeFavorite(HttpServletRequest request, @PathVariable("resourceId") long resourceId) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);

        jdbc.update("DELETE FROM saved_resources WHERE user_id = ? AND resource_id = ?", userId, resourceId);
        return Map.of("message", "Resource removed from favorites.");
    }

    @SuppressWarnings("unchecked")
    @GetMapping("/stats")
    public Map<String, Object> userStats(HttpServletRequest request) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);

        long favoritesCount = jdbc.queryForObject("SELECT COUNT(*) FROM saved_resources WHERE user_id = ?", Long.class, userId);
        long uploadsCount = jdbc.queryForObject("SELECT COUNT(*) FROM resources WHERE uploaded_by = ?", Long.class, userId);

        // Fetch download count from usage-service
        long downloadsCount = 0;
        try {
            String url = "http://usage-service/api/usage/stats/user/" + userId;
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("downloads")) {
                downloadsCount = ((Number) response.get("downloads")).longValue();
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch download stats: " + e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "USAGE_SERVICE_UNAVAILABLE", "Usage service is temporarily unavailable.");
        }

        return Map.of(
                "downloads", downloadsCount,
                "favorites", favoritesCount,
                "uploads", uploadsCount
        );
    }
}
