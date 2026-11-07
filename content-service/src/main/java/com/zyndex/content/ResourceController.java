package com.zyndex.content;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@RestController
@RequestMapping("/api/resources")
class ResourceController {
    private final JdbcTemplate jdbc;
    private final SqlSupport sql;
    private final AppProperties properties;
    private final RestTemplate restTemplate;

    ResourceController(JdbcTemplate jdbc, SqlSupport sql, AppProperties properties, RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    @GetMapping
    Map<String, Object> all(@RequestParam Map<String, String> query) {
        return list(query);
    }

    @GetMapping("/search")
    Map<String, Object> search(@RequestParam Map<String, String> query) {
        String q = query.get("query") != null ? query.get("query") : query.get("q");
        query.put("search", q != null ? q : "");
        return list(query);
    }

    @GetMapping("/category/{category}")
    Map<String, Object> category(@PathVariable("category") String category, @RequestParam Map<String, String> query) {
        query.put("category", category);
        return list(query);
    }

    @GetMapping("/{id}")
    Map<String, Object> one(@PathVariable("id") long id) {
        var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }
        return mapResourceWithDetails(rows.get(0));
    }

    @GetMapping("/categories")
    Object categories() {
        return jdbc.queryForList("SELECT category AS name, COUNT(*) AS count FROM resources GROUP BY category ORDER BY category ASC");
    }

    @GetMapping("/stats")
    Map<String, Object> stats(HttpServletRequest request) {
        requireAdmin(request);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM resources", Long.class);
        return Map.of(
                "totalResources", total,
                "byCategory", jdbc.queryForList("SELECT category, COUNT(*) AS total FROM resources GROUP BY category ORDER BY category ASC"),
                "recentUploads", jdbc.queryForList("SELECT id, title, category, author, created_at, updated_at FROM resources ORDER BY COALESCE(updated_at, created_at) DESC LIMIT 5"));
    }

    @GetMapping("/featured")
    Object featured(@RequestParam(name = "limit", defaultValue = "6") int limit) {
        limit = Math.min(Math.max(limit, 1), 20);
        return jdbc.queryForList("SELECT * FROM resources ORDER BY COALESCE(updated_at, created_at) DESC LIMIT ?", limit)
                .stream().map(this::mapResourceWithDetails).toList();
    }

    @PostMapping
    Map<String, Object> upload(
            HttpServletRequest request,
            @RequestParam Map<String, String> form,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {
        String userIdStr = request.getHeader("X-User-Id");
        requireAdmin(request);

        long userId = Long.parseLong(userIdStr);
        String title = field(form, "title");
        String category = field(form, "category");
        String subject = field(form, "subject", "author");
        String resourceType = field(form, "resourceType", "type");
        String description = field(form, "description");
        String requiredPlan = form.getOrDefault("requiredPlan", "FREE");
        if (requiredPlan == null || requiredPlan.isBlank()) {
            requiredPlan = "FREE";
        }
        requiredPlan = requiredPlan.toUpperCase();

        boolean isPdf = "pdf".equalsIgnoreCase(resourceType) || "guide".equalsIgnoreCase(resourceType);
        if (blank(title) || blank(category) || blank(subject) || blank(resourceType) || blank(description) || (isPdf && (file == null || file.isEmpty()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, isPdf ? "All PDF fields and a file are required." : "All article fields are required.");
        }

        String fileUrl = file == null || file.isEmpty() ? null : storeFile(file);
        jdbc.update("""
                INSERT INTO resources
                (approved, downloads_count, rating, created_at, updated_at, uploaded_by, description, author, category, file_url, image_url, title, type, required_plan)
                VALUES (1, 0, 0, NOW(), NOW(), ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                """, userId, description, subject, category, fileUrl, title, SqlSupport.dbType(resourceType), requiredPlan);
        return Map.of("message", "Resource uploaded successfully.", "resourceId", jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class));
    }

    @PutMapping("/{id}")
    Map<String, Object> update(
            HttpServletRequest request,
            @PathVariable("id") long id,
            @RequestParam Map<String, String> form,
            @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {
        requireAdmin(request);
        var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }

        String title = field(form, "title");
        String category = field(form, "category");
        String subject = field(form, "subject", "author");
        String resourceType = field(form, "resourceType", "type");
        String description = field(form, "description");
        String requiredPlan = form.getOrDefault("requiredPlan", SqlSupport.str(rows.get(0).get("required_plan")));
        if (requiredPlan == null || requiredPlan.isBlank()) {
            requiredPlan = "FREE";
        }
        requiredPlan = requiredPlan.toUpperCase();

        String fileUrl = SqlSupport.str(rows.get(0).get("file_url"));
        if (file != null && !file.isEmpty()) {
            fileUrl = storeFile(file);
        }
        jdbc.update("UPDATE resources SET description = ?, author = ?, category = ?, file_url = ?, title = ?, type = ?, required_plan = ?, updated_at = NOW() WHERE id = ?",
                description, subject, category, fileUrl, title, SqlSupport.dbType(resourceType), requiredPlan, id);
        return Map.of("message", "Resource updated successfully.");
    }

    @DeleteMapping("/{id}")
    Map<String, Object> delete(HttpServletRequest request, @PathVariable("id") long id) {
        requireAdmin(request);
        int count = jdbc.update("DELETE FROM resources WHERE id = ?", id);
        if (count == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }
        return Map.of("message", "Resource deleted successfully.");
    }

    @PostMapping("/{id}/download-token")
    Map<String, Object> createDownloadToken(
            @PathVariable("id") long id,
            HttpServletRequest request) {
        String userIdStr = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");

        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        long userId = Long.parseLong(userIdStr);
        String token = UUID.randomUUID().toString();

        jdbc.update("INSERT INTO download_tokens (token, resource_id, user_id, role, created_at) VALUES (?, ?, ?, ?, NOW())",
                token, id, userId, role);

        return Map.of("token", token);
    }

    @GetMapping("/{id}/file")
    ResponseEntity<?> serveFile(
            @PathVariable("id") long id,
            @RequestParam(value = "token", required = false) String token,
            HttpServletRequest request) {

        String userIdStr = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");

        if (token != null && !token.isBlank()) {
            if (!token.contains(".")) {
                // Short-lived UUID one-time token
                var tokens = jdbc.queryForList("SELECT * FROM download_tokens WHERE token = ? AND resource_id = ?", token, id);
                if (tokens.isEmpty()) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Invalid or expired download token.");
                }
                Map<String, Object> t = tokens.get(0);

                java.util.Date createdAt = (java.util.Date) t.get("created_at");
                if (System.currentTimeMillis() - createdAt.getTime() > 60000) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Download token has expired.");
                }

                userIdStr = String.valueOf(t.get("user_id"));
                role = String.valueOf(t.get("role"));
            } else {
                // JWT Token fallback
                Map<String, Object> resolved = validateTokenInternally(token);
                userIdStr = String.valueOf(resolved.get("id"));
                role = String.valueOf(resolved.get("role"));
            }
        }

        if (userIdStr == null || userIdStr.isBlank() || "null".equals(userIdStr)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        long userId = Long.parseLong(userIdStr);

        var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }
        String fileUrl = SqlSupport.str(rows.get(0).get("file_url"));
        String title = SqlSupport.str(rows.get(0).get("title"));
        String category = SqlSupport.str(rows.get(0).get("category"));
        String type = SqlSupport.str(rows.get(0).get("type"));

        Map<String, Object> accessDetails = checkAccessDetails(userId, id, "READ", role, category, type);
        boolean isAuthorized = accessDetails != null && Boolean.TRUE.equals(accessDetails.get("authorized"));
        if (!isAuthorized) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access entitlement to read this resource.");
        }

        logUsageEvent(userId, id, "VIEW");

        // Record granular microservice audit log for resource loading
        try {
            Map<String, Object> uProf = fetchUserProfile(userId);
            String uEmail = SqlSupport.str(uProf.get("email"));
            String uName = SqlSupport.str(uProf.get("name"));
            String formattedTimestamp = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z"));
            String clientIp = request.getHeader("X-Forwarded-For") != null ? request.getHeader("X-Forwarded-For").split(",")[0].trim() : request.getRemoteAddr();
            String sliceInfo = (accessDetails != null && accessDetails.containsKey("pageLimit")) ? " [Page preview limited to " + accessDetails.get("pageLimit") + " pages]" : " [Full Document Access]";
            
            String logDetail = String.format(
                    "Content service verified entitlements and streamed resource \"%s\" (Resource ID: %d, Category: \"%s\", Type: %s) to scholar %s <%s> (User ID: %d, Role: %s)%s. Timestamp: %s",
                    title, id, category, type, uName, uEmail, userId, role, sliceInfo, formattedTimestamp
            );
            jdbc.update("""
                    INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'CONTENT-SERVICE', 'INFO', 'RESOURCE_STREAM_AUTHORIZED', ?, ?, ?, 'SUCCESS')
                    """, uEmail, logDetail, clientIp);
        } catch (Exception ignored) {}

        if (fileUrl.matches("(?i)^https?://.*")) {
            return downloadExternalFile(fileUrl, title);
        }
        Path file = resolveStoredFile(fileUrl);
        if (!Files.exists(file)) {
            System.err.println("Resource file not found. fileUrl=" + fileUrl + ", resolvedPath=" + file.toAbsolutePath());
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource file is missing from the server.");
        }

        // If there's a page limit restriction, slice the PDF
        if (accessDetails != null && accessDetails.containsKey("pageLimit") && file.getFileName().toString().toLowerCase().endsWith(".pdf")) {
            int pageLimit = Integer.parseInt(String.valueOf(accessDetails.get("pageLimit")));
            try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(file.toFile())) {
                int pageCount = document.getNumberOfPages();
                if (pageCount > pageLimit) {
                    try (org.apache.pdfbox.pdmodel.PDDocument sliced = new org.apache.pdfbox.pdmodel.PDDocument()) {
                        for (int i = 0; i < pageLimit; i++) {
                            sliced.addPage(document.getPage(i));
                        }
                        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                        sliced.save(out);
                        return ResponseEntity.ok()
                                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                                .body(out.toByteArray());
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to slice PDF file: " + e.getMessage());
                // Fallback to serving the full document if slicing fails for some reason
            }
        }

        return ResponseEntity.ok()
                .contentType(contentTypeForFile(file.getFileName().toString()))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFileName() + "\"")
                .body(new FileSystemResource(file));
    }

    @GetMapping("/{id}/download")
    ResponseEntity<?> download(HttpServletRequest request, @PathVariable("id") long id) {
        String userIdStr = request.getHeader("X-User-Id");
        String role = request.getHeader("X-User-Role");

        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        if (!"ADMIN".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Downloads are not available in the user portal. Use the online preview instead.");
        }

        long userId = Long.parseLong(userIdStr);

        var rows = jdbc.queryForList("SELECT * FROM resources WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }
        String fileUrl = SqlSupport.str(rows.get(0).get("file_url"));
        String title = SqlSupport.str(rows.get(0).get("title"));
        String category = SqlSupport.str(rows.get(0).get("category"));
        String type = SqlSupport.str(rows.get(0).get("type"));

        boolean isAuthorized = checkAccess(userId, id, "DOWNLOAD", role, category, type);
        if (!isAuthorized) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You do not have access entitlement to download this resource.");
        }

        jdbc.update("UPDATE resources SET downloads_count = downloads_count + 1 WHERE id = ?", id);

        logUsageEvent(userId, id, "DOWNLOAD");

        if (fileUrl.matches("(?i)^https?://.*")) {
            return downloadExternalFile(fileUrl, title);
        }
        Path file = Path.of(fileUrl).isAbsolute() ? Path.of(fileUrl) : Path.of(properties.uploadDir()).getParent().resolve(fileUrl).normalize();
        if (!Files.exists(file)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource file is missing from the server.");
        }
        return ResponseEntity.ok()
                .contentType(contentTypeForFile(file.getFileName().toString()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                .body(new FileSystemResource(file));
    }

    @PostMapping("/{id}/track")
    Map<String, Object> track(HttpServletRequest request, @PathVariable("id") long id) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr != null && !userIdStr.isBlank()) {
            long userId = Long.parseLong(userIdStr);
            logUsageEvent(userId, id, "VIEW");
        }
        return Map.of("message", "Resource access tracked successfully.");
    }

    @PostMapping("/{id}/track-duration")
    Map<String, Object> trackDuration(HttpServletRequest request, @PathVariable("id") long id, @RequestBody Map<String, Object> body) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr != null && !userIdStr.isBlank()) {
            long userId = Long.parseLong(userIdStr);
            Integer duration = body.get("duration") != null ? Integer.parseInt(String.valueOf(body.get("duration"))) : 0;
            logUsageDuration(userId, id, duration);

            // Record granular reading progress audit
            if (duration != null && duration > 0) {
                try {
                    Map<String, Object> uProf = fetchUserProfile(userId);
                    String uEmail = SqlSupport.str(uProf.get("email"));
                    String uName = SqlSupport.str(uProf.get("name"));
                    String resTitle = "Resource #" + id;
                    try {
                        var rList = jdbc.queryForList("SELECT title FROM resources WHERE id = ? LIMIT 1", id);
                        if (!rList.isEmpty()) resTitle = String.valueOf(rList.get(0).get("title"));
                    } catch (Exception ignored) {}

                    String formattedTimestamp = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Kolkata")).format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss z"));
                    String clientIp = request.getHeader("X-Forwarded-For") != null ? request.getHeader("X-Forwarded-For").split(",")[0].trim() : request.getRemoteAddr();

                    String progressDetail = String.format(
                            "Scholar %s (%s, User ID: %d) recorded %d seconds active academic reading session on \"%s\" (Resource ID: %d). Timestamp: %s",
                            uName, uEmail, userId, duration, resTitle, id, formattedTimestamp
                    );

                    jdbc.update("""
                            INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                            VALUES (NOW(), 'USAGE-SERVICE', 'INFO', 'READING_PROGRESS_SAVED', ?, ?, ?, 'SUCCESS')
                            """, uEmail, progressDetail, clientIp);
                } catch (Exception ignored) {}
            }
        }
        return Map.of("message", "Resource reading duration tracked successfully.");
    }

    @PostMapping("/{id}/rate")
    Map<String, Object> rate(HttpServletRequest request, @PathVariable("id") long id, @RequestBody Map<String, Object> body) {
        String userIdStr = request.getHeader("X-User-Id");
        if (userIdStr == null || userIdStr.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        long userId = Long.parseLong(userIdStr);
        int rating = SqlSupport.parseInt(SqlSupport.str(body.get("rating")), 0);
        if (rating < 1 || rating > 5) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5.");
        }
        boolean isAnonymous = Boolean.TRUE.equals(body.get("isAnonymous")) || "true".equalsIgnoreCase(SqlSupport.str(body.get("isAnonymous")));
        jdbc.update("INSERT INTO feedback (rating, created_at, resource_id, user_id, comment, is_anonymous) VALUES (?, NOW(), ?, ?, ?, ?)",
                rating, id, userId, SqlSupport.str(body.get("comment")), isAnonymous);
        jdbc.update("UPDATE resources SET rating = (SELECT COALESCE(AVG(rating), 0) FROM feedback WHERE resource_id = ?) WHERE id = ?", id, id);
        return Map.of("message", "Rating submitted successfully.");
    }

    @GetMapping("/{id}/ratings")
    Map<String, Object> ratings(@PathVariable("id") long id, @RequestParam Map<String, String> query) {
        var page = sql.page(query);
        var rows = jdbc.queryForList("""
                SELECT f.id, f.rating, f.comment, f.created_at, f.user_id, f.is_anonymous
                FROM feedback f WHERE f.resource_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?
                """, id, page.get("size"), page.get("offset"));
        var summary = jdbc.queryForList("SELECT COUNT(*) AS totalRatings, AVG(rating) AS averageRating FROM feedback WHERE resource_id = ?", id).get(0);

        List<Map<String, Object>> mappedRatings = rows.stream().map(row -> {
            long userId = SqlSupport.number(row.get("user_id"));
            boolean isAnon = Boolean.TRUE.equals(row.get("is_anonymous")) || "1".equals(String.valueOf(row.get("is_anonymous")));
            Map<String, Object> profile = fetchUserProfile(userId);
            String displayName = isAnon ? "Anonymous Reader" : String.valueOf(SqlSupport.first(profile.get("name"), "Student Reader"));
            String displayEmail = isAnon ? "anonymous@reader.zyndex" : String.valueOf(SqlSupport.first(profile.get("email"), "reader@zyndex.com"));

            return Map.of(
                "id", row.get("id"),
                "rating", row.get("rating"),
                "comment", SqlSupport.first(row.get("comment"), ""),
                "created_at", row.get("created_at"),
                "isAnonymous", isAnon,
                "name", displayName,
                "email", displayEmail
            );
        }).toList();

        return Map.of("ratings", mappedRatings, "averageRating", SqlSupport.first(summary.get("averageRating"), 0), "totalRatings", summary.get("totalRatings"), "currentPage", page.get("page"));
    }

    private Map<String, Object> list(Map<String, String> query) {
        var page = sql.page(query);
        String search = query.get("search") == null || query.get("search").isBlank() ? null : "%" + query.get("search") + "%";
        String category = query.get("category");
        String type = query.get("type") == null || "all".equals(query.get("type")) ? null : SqlSupport.dbType(query.get("type"));
        String order = "title".equals(query.get("sort")) ? "r.title ASC" : "popular".equals(query.get("sort")) ? "r.downloads_count DESC" : "COALESCE(r.updated_at, r.created_at) DESC";
        var args = new Object[] { category, category, type, type, search, search, search, search };
        var rows = jdbc.queryForList("""
                SELECT r.* FROM resources r
                                WHERE (? IS NULL OR LOWER(TRIM(r.category)) = LOWER(TRIM(?)))
                  AND (? IS NULL OR r.type = ?)
                  AND (? IS NULL OR r.title LIKE ? OR r.description LIKE ? OR r.author LIKE ?)
                ORDER BY %s LIMIT ? OFFSET ?
                """.formatted(order), concat(args, page.get("size"), page.get("offset")));
        long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM resources r
                                WHERE (? IS NULL OR LOWER(TRIM(r.category)) = LOWER(TRIM(?)))
                  AND (? IS NULL OR r.type = ?)
                  AND (? IS NULL OR r.title LIKE ? OR r.description LIKE ? OR r.author LIKE ?)
                """, Long.class, args);
        return sql.pageResult("resources", rows.stream().map(this::mapResourceWithDetails).toList(), total, page.get("page"), page.get("size"));
    }

    private Map<String, Object> mapResourceWithDetails(Map<String, Object> row) {
        long uploadedBy = SqlSupport.number(row.get("uploaded_by"));
        long resourceId = SqlSupport.number(row.get("id"));

        String uploaderName = fetchUploaderName(uploadedBy);
        long viewCount = fetchViewCount(resourceId);

        Map<String, Object> resource = sql.mapResource(row);
        resource.put("uploadedByName", uploaderName);
        resource.put("viewCount", viewCount);
        return resource;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> checkAccessDetails(long userId, long resourceId, String permission, String role, String category, String type) {
        try {
            String requiredPlan = "FREE";
            if (resourceId > 0) {
                var rows = jdbc.queryForList("SELECT required_plan FROM resources WHERE id = ? LIMIT 1", resourceId);
                if (!rows.isEmpty()) {
                    requiredPlan = SqlSupport.str(rows.get(0).get("required_plan"));
                }
            }
            String encodedCategory = java.net.URLEncoder.encode(category != null ? category : "", java.nio.charset.StandardCharsets.UTF_8);
            String encodedType = java.net.URLEncoder.encode(type != null ? type : "", java.nio.charset.StandardCharsets.UTF_8);
            String encodedPlan = java.net.URLEncoder.encode(requiredPlan != null && !requiredPlan.isBlank() ? requiredPlan : "FREE", java.nio.charset.StandardCharsets.UTF_8);
            String url = "http://access-service/api/access/check?userId=" + userId
                    + "&resourceId=" + resourceId
                    + "&permission=" + permission
                    + "&role=" + role
                    + "&category=" + encodedCategory
                    + "&type=" + encodedType
                    + "&requiredPlan=" + encodedPlan;
            return restTemplate.getForObject(url, Map.class);
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            if (e.getStatusCode() == org.springframework.http.HttpStatus.FORBIDDEN || e.getStatusCode() == org.springframework.http.HttpStatus.UNAUTHORIZED) {
                return Map.of("authorized", false);
            }
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "ACCESS_SERVICE_UNAVAILABLE", "Access service is temporarily unavailable.");
        } catch (Exception e) {
            System.err.println("Access check failed: " + e.getMessage());
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "ACCESS_SERVICE_UNAVAILABLE", "Access service is temporarily unavailable.");
        }
    }

    private boolean checkAccess(long userId, long resourceId, String permission, String role, String category, String type) {
        Map<String, Object> res = checkAccessDetails(userId, resourceId, permission, role, category, type);
        return res != null && Boolean.TRUE.equals(res.get("authorized"));
    }

    private void logUsageEvent(long userId, long resourceId, String eventType) {
        try {
            String url = "http://usage-service/api/usage/events";
            restTemplate.postForObject(url, Map.of(
                    "userId", userId,
                    "resourceId", resourceId,
                    "eventType", eventType
            ), Map.class);
        } catch (Exception e) {
            System.err.println("Failed to log usage: " + e.getMessage());
        }
    }

    private void logUsageDuration(long userId, long resourceId, int duration) {
        try {
            String url = "http://usage-service/api/usage/records";
            restTemplate.postForObject(url, Map.of(
                    "userId", userId,
                    "contentId", resourceId,
                    "duration", duration
            ), Map.class);
        } catch (Exception e) {
            System.err.println("Failed to log usage duration: " + e.getMessage());
        }
    }

    private String fetchUploaderName(long userId) {
        try {
            Map<String, Object> profile = fetchUserProfile(userId);
            return profile != null ? SqlSupport.str(profile.get("name")) : "System";
        } catch (Exception e) {
            return "System";
        }
    }

    private long fetchViewCount(long resourceId) {
        try {
            String url = "http://usage-service/api/usage/views/count?resourceId=" + resourceId;
            Long count = restTemplate.getForObject(url, Long.class);
            return count != null ? count : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    private Map<String, Object> fetchUserProfile(long userId) {
        try {
            var directUser = jdbc.queryForList("""
                    SELECT COALESCE(NULLIF(username, ''), NULLIF(name, ''), email) AS name, email
                    FROM zyndex_auth.users WHERE id = ? LIMIT 1
                    """, userId);
            if (!directUser.isEmpty() && directUser.get(0).get("email") != null) {
                return directUser.get(0);
            }
        } catch (Exception ignored) {}

        try {
            var localUser = jdbc.queryForList("""
                    SELECT COALESCE(NULLIF(username, ''), NULLIF(name, ''), email) AS name, email
                    FROM users WHERE id = ? LIMIT 1
                    """, userId);
            if (!localUser.isEmpty() && localUser.get(0).get("email") != null) {
                return localUser.get(0);
            }
        } catch (Exception ignored) {}

        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Service", "content-service");
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            String url = "http://auth-service/api/users/" + userId + "/profile";
            org.springframework.core.ParameterizedTypeReference<Map<String, Object>> typeRef = new org.springframework.core.ParameterizedTypeReference<>() {};
            org.springframework.http.ResponseEntity<Map<String, Object>> response = restTemplate.exchange(url, org.springframework.http.HttpMethod.GET, entity, typeRef);
            if (response.getBody() != null && response.getBody().get("email") != null) {
                return response.getBody();
            }
        } catch (Exception ignored) {}

        return Map.of("name", "Student Reader", "email", "reader@zyndex.com");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Map<String, Object> validateTokenInternally(String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + token);
            org.springframework.http.HttpEntity<Void> entity = new org.springframework.http.HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange("http://auth-service/api/auth/me", org.springframework.http.HttpMethod.GET, entity, Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String storeFile(MultipartFile file) throws IOException {
        Path dir = resolveUploadDirectory();
        Files.createDirectories(dir);
        String extension = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String name = UUID.randomUUID() + (extension == null ? "" : "." + extension);
        file.transferTo(dir.resolve(name));
        return "uploads/" + name;
    }

    private Path resolveStoredFile(String fileUrl) {
        Path requested = Path.of(fileUrl);
        if (requested.isAbsolute()) {
            return requested.normalize();
        }

        // Uploaded files are stored as backend/uploads/<generated-name> while the DB keeps uploads/<generated-name>.
        if (fileUrl.replace('\\', '/').startsWith("uploads/")) {
            String filename = requested.getFileName().toString();
            for (Path directory : uploadDirectoryCandidates()) {
                Path candidate = directory.resolve(filename).normalize();
                if (Files.exists(candidate)) {
                    return candidate;
                }
            }
            return uploadDirectoryCandidates().get(0).resolve(filename).normalize();
        }
        return resolveUploadDirectory().resolve(requested).normalize();
    }

    private List<Path> uploadDirectoryCandidates() {
        Path configured = Path.of(properties.uploadDir());
        if (configured.isAbsolute()) {
            return List.of(configured.normalize());
        }

        List<Path> candidates = new ArrayList<>();
        Path directory = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        for (int depth = 0; depth < 8 && directory != null; depth++) {
            Path candidate = directory.resolve(configured).normalize();
            if (!candidates.contains(candidate)) {
                candidates.add(candidate);
            }
            directory = directory.getParent();
        }
        return candidates;
    }

    private Path resolveUploadDirectory() {
        for (Path candidate : uploadDirectoryCandidates()) {
            if (Files.isDirectory(candidate)) {
                return candidate;
            }
        }
        return uploadDirectoryCandidates().get(0);
    }

    private ResponseEntity<?> downloadExternalFile(String fileUrl, String title) {
        try (InputStream stream = URI.create(fileUrl).toURL().openStream()) {
            byte[] bytes = stream.readAllBytes();
            String filename = externalFilename(fileUrl, title);
            return ResponseEntity.ok()
                    .contentType(contentTypeForFile(filename))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(bytes);
        } catch (IOException error) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to download the external resource file.");
        }
    }

    private MediaType contentTypeForFile(String filename) {
        String lower = filename == null ? "" : filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }
        if (lower.endsWith(".txt")) {
            return MediaType.TEXT_PLAIN;
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private String externalFilename(String fileUrl, String fallbackTitle) {
        String path = URI.create(fileUrl).getPath();
        String candidate = Path.of(path).getFileName() == null ? "" : Path.of(path).getFileName().toString();
        if (!candidate.isBlank()) {
            return candidate;
        }
        String normalizedTitle = fallbackTitle == null || fallbackTitle.isBlank() ? "resource" : fallbackTitle.replaceAll("[^a-zA-Z0-9-_\\. ]", "").trim();
        return normalizedTitle.isBlank() ? "resource" : normalizedTitle;
    }

    private void requireAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (!"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required.");
        }
    }

    private static Object[] concat(Object[] base, Object... suffix) {
        Object[] combined = new Object[base.length + suffix.length];
        System.arraycopy(base, 0, combined, 0, base.length);
        System.arraycopy(suffix, 0, combined, base.length, suffix.length);
        return combined;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String field(Map<String, String> form, String... names) {
        for (String name : names) {
            String value = form.get(name);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
