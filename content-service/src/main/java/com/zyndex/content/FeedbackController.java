package com.zyndex.content;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
class FeedbackController {
    private final JdbcTemplate jdbc;
    private final SqlSupport sql;
    private final RestTemplate restTemplate;
    private final ContactEmailService contactEmailService;

    FeedbackController(JdbcTemplate jdbc, SqlSupport sql, RestTemplate restTemplate, ContactEmailService contactEmailService) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.restTemplate = restTemplate;
        this.contactEmailService = contactEmailService;
    }

    @PostMapping
    Map<String, Object> submit(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);
        long resourceId = SqlSupport.number(body.get("resourceId"));
        if (resourceId == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A logged-in user and resource are required.");
        }
        jdbc.update("INSERT INTO feedback (rating, created_at, resource_id, user_id, comment) VALUES (?, NOW(), ?, ?, ?)",
                SqlSupport.parseInt(SqlSupport.str(body.get("rating")), 0), resourceId, userId, SqlSupport.str(body.get("message")));
        return Map.of("message", "Feedback submitted successfully.", "feedbackId", jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class));
    }

    @PostMapping("/contact")
    Map<String, Object> contact(@RequestBody Map<String, Object> body) {
        String name = SqlSupport.str(body.get("name"));
        String email = SqlSupport.str(body.get("email"));
        String subject = SqlSupport.str(body.get("subject"));
        String message = SqlSupport.str(body.get("message"));
        if (name.isBlank() || email.isBlank() || subject.isBlank() || message.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "All contact fields are required.");
        }
        jdbc.update("INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)", name, email, subject, message);
        Map<String, Boolean> emailStatus = contactEmailService.sendContactEmails(name, email, subject, message);
        return Map.of("message", "Message sent successfully.",
            "adminEmailSent", emailStatus.get("adminEmailSent"),
            "requesterEmailSent", emailStatus.get("requesterEmailSent"));
    }

    @GetMapping
    Map<String, Object> all(HttpServletRequest request, @RequestParam Map<String, String> query) {
        requireAdmin(request);
        var page = sql.page(query);
        var rows = jdbc.queryForList("""
                SELECT f.id, f.rating, f.created_at, f.comment, f.user_id, r.title, r.category
                FROM feedback f JOIN resources r ON r.id = f.resource_id
                ORDER BY f.created_at DESC LIMIT ? OFFSET ?
                """, page.get("size"), page.get("offset"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM feedback", Long.class);

        List<Map<String, Object>> mappedFeedback = rows.stream().map(row -> {
            long userId = SqlSupport.number(row.get("user_id"));
            Map<String, Object> userProfile = fetchUserProfile(userId);
            return Map.of(
                "id", row.get("id"),
                "userName", SqlSupport.first(userProfile.get("name"), "Unknown User"),
                "email", SqlSupport.first(userProfile.get("email"), "unknown@example.com"),
                "category", row.get("category"),
                "comment", SqlSupport.first(row.get("comment"), ""),
                "message", SqlSupport.first(row.get("comment"), ""),
                "rating", row.get("rating"),
                "status", "reviewed",
                "date", row.get("created_at"),
                "resourceTitle", row.get("title")
            );
        }).toList();

        return sql.pageResult("feedback", mappedFeedback, total, page.get("page"), page.get("size"));
    }

    @GetMapping("/stats")
    Map<String, Object> stats(HttpServletRequest request) {
        requireAdmin(request);
        var total = jdbc.queryForList("SELECT COUNT(*) AS total, AVG(rating) AS averageRating FROM feedback").get(0);
        return Map.of(
                "total", SqlSupport.first(total.get("total"), 0),
                "averageRating", SqlSupport.first(total.get("averageRating"), 0),
                "byCategory", jdbc.queryForList("SELECT r.category, COUNT(*) AS total FROM feedback f JOIN resources r ON r.id = f.resource_id GROUP BY r.category ORDER BY r.category ASC"),
                "byStatus", java.util.List.of(Map.of("status", "reviewed", "total", SqlSupport.first(total.get("total"), 0))));
    }

    @GetMapping("/{id}")
    Map<String, Object> one(HttpServletRequest request, @PathVariable("id") long id) {
        requireAdmin(request);
        var rows = jdbc.queryForList("SELECT * FROM feedback WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Feedback not found.");
        }
        return rows.get(0);
    }

    @PutMapping("/{id}/status")
    Map<String, Object> status(HttpServletRequest request) {
        requireAdmin(request);
        return Map.of("message", "Status updates are not supported by the current schema.");
    }

    @PostMapping("/{id}/respond")
    Map<String, Object> respond(HttpServletRequest request) {
        requireAdmin(request);
        return Map.of("message", "Admin responses are not supported by the current schema.");
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest request, @PathVariable("id") long id) {
        requireAdmin(request);
        jdbc.update("DELETE FROM feedback WHERE id = ?", id);
        return Map.of("message", "Feedback deleted successfully.");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchUserProfile(long userId) {
        try {
            String url = "http://auth-service/api/users/" + userId + "/profile";
            return restTemplate.getForObject(url, Map.class);
        } catch (Exception e) {
            return Map.of("name", "Unknown User", "email", "unknown@example.com");
        }
    }

    private void requireAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (!"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }
}
