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
                SELECT f.id, f.rating, f.created_at, f.comment, f.admin_response, f.responded_at, f.user_id, r.title, r.category
                FROM feedback f JOIN resources r ON r.id = f.resource_id
                ORDER BY f.created_at DESC LIMIT ? OFFSET ?
                """, page.get("size"), page.get("offset"));
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM feedback", Long.class);

        List<Map<String, Object>> mappedFeedback = rows.stream().map(row -> {
            long userId = SqlSupport.number(row.get("user_id"));
            Map<String, Object> userProfile = fetchUserProfile(userId);
            return Map.of(
                "id", row.get("id"),
                "userId", userId,
                "userName", SqlSupport.first(userProfile.get("name"), "Student Reader"),
                "email", SqlSupport.first(userProfile.get("email"), "user@zyndex.com"),
                "category", row.get("category"),
                "comment", SqlSupport.first(row.get("comment"), ""),
                "message", SqlSupport.first(row.get("comment"), ""),
                "rating", row.get("rating"),
                "status", row.get("admin_response") != null ? "responded" : "reviewed",
                "adminResponse", SqlSupport.first(row.get("admin_response"), ""),
                "respondedAt", SqlSupport.first(row.get("responded_at"), ""),
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
    Map<String, Object> respond(HttpServletRequest request, @PathVariable("id") long id, @RequestBody Map<String, Object> body) {
        requireAdmin(request);
        String adminComment = SqlSupport.str(body.get("response"));
        if (adminComment.isBlank()) {
            adminComment = SqlSupport.str(body.get("comment"));
        }
        if (adminComment.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Response comment cannot be empty.");
        }

        var rows = jdbc.queryForList("""
                SELECT f.id, f.rating, f.created_at, f.comment, f.user_id, r.title
                FROM feedback f JOIN resources r ON r.id = f.resource_id
                WHERE f.id = ? LIMIT 1
                """, id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Feedback not found.");
        }

        var feedback = rows.get(0);
        long userId = SqlSupport.number(feedback.get("user_id"));
        Map<String, Object> userProfile = fetchUserProfile(userId);

        String userEmail = SqlSupport.str(userProfile.get("email"));
        String userName = SqlSupport.str(userProfile.get("name"));
        String resourceTitle = SqlSupport.str(feedback.get("title"));
        String userComment = SqlSupport.str(feedback.get("comment"));
        int rating = SqlSupport.parseInt(SqlSupport.str(feedback.get("rating")), 5);
        String feedbackDate = SqlSupport.str(feedback.get("created_at"));

        String adminName = SqlSupport.first(request.getHeader("X-User-Name"), "Zyndex Administrator");

        jdbc.update("UPDATE feedback SET admin_response = ?, responded_at = NOW() WHERE id = ?", adminComment, id);

        boolean emailSent = false;
        if (userEmail != null && !userEmail.isBlank() && !userEmail.contains("example.com")) {
            emailSent = contactEmailService.sendFeedbackResponseEmail(
                    userEmail, userName, resourceTitle, userComment, rating, feedbackDate, adminComment, adminName
            );
        }

        return Map.of(
                "message", "Admin response recorded and email notification sent to user.",
                "emailSent", emailSent,
                "adminResponse", adminComment
        );
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
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Service", "content-service");
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            String url = "http://auth-service/api/users/" + userId + "/profile";
            org.springframework.http.ResponseEntity<Map> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            try {
                var directUser = jdbc.queryForList("SELECT name, email FROM users WHERE id = ? LIMIT 1", userId);
                if (!directUser.isEmpty()) {
                    return directUser.get(0);
                }
            } catch (Exception ignored) {}
            return Map.of("name", "Student Reader", "email", "reader@zyndex.com");
        }
    }

    private void requireAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (!"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }
}
