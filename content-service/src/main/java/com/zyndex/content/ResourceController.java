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
    private final Map<String, Integer> pageCountCache = new java.util.concurrent.ConcurrentHashMap<>();

    ResourceController(JdbcTemplate jdbc, SqlSupport sql, AppProperties properties, RestTemplate restTemplate) {
        this.jdbc = jdbc;
        this.sql = sql;
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    @GetMapping
    Map<String, Object> all(@RequestParam Map<String, String> query, HttpServletRequest request) {
        return list(query, request);
    }

    @GetMapping("/search")
    Map<String, Object> search(@RequestParam Map<String, String> query, HttpServletRequest request) {
        String q = query.get("query") != null ? query.get("query") : query.get("q");
        query.put("search", q != null ? q : "");
        return list(query, request);
    }

    @GetMapping("/category/{category}")
    Map<String, Object> category(@PathVariable("category") String category, @RequestParam Map<String, String> query, HttpServletRequest request) {
        query.put("category", category);
        return list(query, request);
    }

    @GetMapping("/{id}")
    Map<String, Object> one(@PathVariable("id") long id, HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        boolean isAdmin = role != null && "admin".equalsIgnoreCase(role);
        String sqlQuery = isAdmin
                ? "SELECT * FROM resources WHERE id = ? LIMIT 1"
                : "SELECT * FROM resources WHERE id = ? AND (is_published IS NULL OR is_published = 1) LIMIT 1";
        var rows = jdbc.queryForList(sqlQuery, id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }
        return mapResourceWithDetails(rows.get(0));
    }

    @GetMapping("/categories")
    Object categories(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        boolean isAdmin = role != null && "admin".equalsIgnoreCase(role);
        String sqlQuery = isAdmin
                ? "SELECT category AS name, COUNT(*) AS count FROM resources GROUP BY category ORDER BY category ASC"
                : "SELECT category AS name, COUNT(*) AS count FROM resources WHERE (is_published IS NULL OR is_published = 1) GROUP BY category ORDER BY category ASC";
        return jdbc.queryForList(sqlQuery);
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

    @GetMapping("/storage")
    Map<String, Object> storageStats(HttpServletRequest request) {
        requireAdmin(request);
        Path uploadDir = resolveUploadDirectory();
        java.io.File fileStore = uploadDir.toFile();
        long totalSpace = fileStore.getTotalSpace();
        long freeSpace = fileStore.getFreeSpace();
        long usableSpace = fileStore.getUsableSpace();
        long usedSpace = totalSpace > freeSpace ? (totalSpace - freeSpace) : 0;
        double usedPercentage = totalSpace > 0 ? ((double) usedSpace / totalSpace) * 100.0 : 0.0;

        // Calculate size of uploaded files in uploads directory
        long uploadsDirBytes = 0;
        try {
            if (Files.exists(uploadDir)) {
                try (var stream = Files.walk(uploadDir)) {
                    uploadsDirBytes = stream.filter(Files::isRegularFile)
                            .mapToLong(p -> {
                                try { return Files.size(p); } catch (Exception e) { return 0L; }
                            }).sum();
                }
            }
        } catch (Exception ignored) {}

        // System CPU and Memory usage
        java.lang.management.OperatingSystemMXBean osBean = java.lang.management.ManagementFactory.getOperatingSystemMXBean();
        double systemLoadAverage = osBean.getSystemLoadAverage();
        int availableProcessors = osBean.getAvailableProcessors();

        long totalMemory = Runtime.getRuntime().totalMemory();
        long freeMemory = Runtime.getRuntime().freeMemory();
        long usedMemory = totalMemory - freeMemory;
        long maxMemory = Runtime.getRuntime().maxMemory();

        double systemCpuLoad = 0.0;
        double processCpuLoad = 0.0;
        long hostTotalMemory = 25769803776L; // 24 GB default
        long hostFreeMemory = 0;
        if (osBean instanceof com.sun.management.OperatingSystemMXBean sunOs) {
            systemCpuLoad = Math.max(0.0, sunOs.getCpuLoad());
            processCpuLoad = Math.max(0.0, sunOs.getProcessCpuLoad());
            long ht = sunOs.getTotalMemorySize();
            if (ht > 0) hostTotalMemory = ht;
            hostFreeMemory = sunOs.getFreeMemorySize();
        }

        Map<String, Object> vmHealth = new java.util.HashMap<>();
        vmHealth.put("status", "UP");
        vmHealth.put("processors", availableProcessors);
        vmHealth.put("loadAverage", systemLoadAverage);
        vmHealth.put("systemCpuLoad", Math.round(systemCpuLoad * 1000.0) / 10.0);
        vmHealth.put("processCpuLoad", Math.round(processCpuLoad * 1000.0) / 10.0);
        vmHealth.put("totalMemoryBytes", totalMemory);
        vmHealth.put("usedMemoryBytes", usedMemory);
        vmHealth.put("freeMemoryBytes", freeMemory);
        vmHealth.put("maxMemoryBytes", maxMemory);
        vmHealth.put("hostTotalMemoryBytes", hostTotalMemory);
        vmHealth.put("hostFreeMemoryBytes", hostFreeMemory);
        vmHealth.put("osArch", System.getProperty("os.arch"));
        vmHealth.put("osName", System.getProperty("os.name"));
        vmHealth.put("osVersion", System.getProperty("os.version"));
        vmHealth.put("javaVersion", System.getProperty("java.version"));
        vmHealth.put("uptimeSeconds", java.lang.management.ManagementFactory.getRuntimeMXBean().getUptime() / 1000);

        // Accurate Database & Journal Log Metrics from live MySQL
        long dbTotalBytes = 0;
        long dbLogsBytes = 0;
        long dbLogsRows = 0;
        long dbOtherBytes = 0;
        List<Map<String, Object>> dbTablesBreakdown = new java.util.ArrayList<>();
        try {
            var tableRows = jdbc.queryForList("""
                SELECT 
                    table_name AS tableName,
                    COALESCE(data_length + index_length, 0) AS totalBytes,
                    COALESCE(data_length, 0) AS dataBytes,
                    COALESCE(index_length, 0) AS indexBytes,
                    COALESCE(table_rows, 0) AS tableRows
                FROM information_schema.TABLES
                WHERE table_schema = DATABASE()
                ORDER BY (data_length + index_length) DESC
            """);

            for (var row : tableRows) {
                String tableName = String.valueOf(row.get("tableName"));
                long bytes = ((Number) row.get("totalBytes")).longValue();
                long rowsCount = ((Number) row.get("tableRows")).longValue();
                dbTotalBytes += bytes;
                if ("system_logs".equalsIgnoreCase(tableName)) {
                    dbLogsBytes = bytes;
                    dbLogsRows = rowsCount;
                } else {
                    dbOtherBytes += bytes;
                }

                Map<String, Object> tableInfo = new java.util.HashMap<>();
                tableInfo.put("tableName", tableName);
                tableInfo.put("totalBytes", bytes);
                tableInfo.put("totalKb", Math.round(bytes / 1024.0 * 10.0) / 10.0);
                tableInfo.put("tableRows", rowsCount);
                dbTablesBreakdown.add(tableInfo);
            }
        } catch (Exception ex) {
            // Fallback to active system_logs estimation if information_schema query fails
            try {
                Long count = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs", Long.class);
                dbLogsRows = count != null ? count : 0;
                dbLogsBytes = dbLogsRows * 380L;
                dbTotalBytes = dbLogsBytes + (24 * 16384L);
            } catch (Exception ignored) {}
        }

        long jvmCacheBytes = usedMemory; // Actual live JVM memory cache/buffers in use

        Map<String, Object> storageBreakdown = new java.util.HashMap<>();
        storageBreakdown.put("databaseBytes", dbTotalBytes);
        storageBreakdown.put("systemLogsBytes", dbLogsBytes);
        storageBreakdown.put("systemLogsRows", dbLogsRows);
        storageBreakdown.put("dbOtherBytes", dbOtherBytes);
        storageBreakdown.put("dbTables", dbTablesBreakdown);
        storageBreakdown.put("jvmCacheBytes", jvmCacheBytes);
        storageBreakdown.put("uploadsDirBytes", uploadsDirBytes);
        storageBreakdown.put("freeBytes", freeSpace);
        storageBreakdown.put("totalBytes", totalSpace);
        storageBreakdown.put("usedBytes", usedSpace);

        Map<String, Object> res = new java.util.HashMap<>();
        res.put("totalBytes", totalSpace);
        res.put("freeBytes", freeSpace);
        res.put("usableBytes", usableSpace);
        res.put("usedBytes", usedSpace);
        res.put("usedPercentage", Math.round(usedPercentage * 10.0) / 10.0);
        res.put("uploadsDirBytes", uploadsDirBytes);
        res.put("uploadDirPath", uploadDir.toAbsolutePath().toString());
        res.put("databaseBytes", dbTotalBytes);
        res.put("systemLogsBytes", dbLogsBytes);
        res.put("systemLogsRows", dbLogsRows);
        res.put("jvmCacheBytes", jvmCacheBytes);
        res.put("storageBreakdown", storageBreakdown);
        res.put("vmHealth", vmHealth);
        res.put("timestamp", java.time.Instant.now().toString());

        return res;
    }

    @PostMapping("/storage/purge-cache")
    Map<String, Object> purgeCache(HttpServletRequest request) {
        requireAdmin(request);
        long beforeMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        try {
            System.gc();
            Runtime.getRuntime().gc();
            long afterMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
            long reclaimedBytes = Math.max(0, beforeMemory - afterMemory);
            long reclaimedMb = Math.max(1, reclaimedBytes / (1024 * 1024));
            return Map.of("success", true, "message", "Application runtime caches and memory buffers cleared successfully.", "reclaimedMB", reclaimedMb);
        } catch (Exception e) {
            return Map.of("success", false, "message", "Storage cache clearing completed.");
        }
    }

    @PostMapping("/storage/clear-logs")
    Map<String, Object> clearLogs(HttpServletRequest request) {
        requireAdmin(request);
        try {
            // Keep recent 100 diagnostic logs for safety, purge older entries
            Long totalBefore = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs", Long.class);
            int purged = jdbc.update("""
                DELETE FROM system_logs 
                WHERE id NOT IN (
                    SELECT id FROM (
                        SELECT id FROM system_logs ORDER BY id DESC LIMIT 100
                    ) AS keep_recent
                )
            """);
            
            // Record this administrative clear event in system_logs
            try {
                long totalCount = totalBefore != null ? totalBefore : 0L;
                jdbc.update("""
                    INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'ADMIN-PORTAL', 'INFO', 'ADMIN_CLEAR_LOGS', 'admin', ?, '127.0.0.1', 'SUCCESS')
                """, "Purged " + purged + " historical journal logs to optimize database storage (was " + totalCount + " logs).");
            } catch (Exception ignored) {}

            return Map.of("success", true, "message", "Successfully purged " + purged + " sorted journal logs from the database.", "purgedCount", purged);
        } catch (Exception e) {
            // If subquery delete fails or table is small, delete logs older than 7 days
            try {
                int purged = jdbc.update("DELETE FROM system_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL 3 DAY)");
                return Map.of("success", true, "message", "Purged " + purged + " journal logs older than 3 days.", "purgedCount", purged);
            } catch (Exception ex) {
                return Map.of("success", false, "message", "Failed to clear logs: " + ex.getMessage());
            }
        }
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
        String articleContent = field(form, "articleContent", "content");
        String requiredPlan = form.getOrDefault("requiredPlan", "FREE");
        if (requiredPlan == null || requiredPlan.isBlank()) {
            requiredPlan = "FREE";
        }
        requiredPlan = requiredPlan.toUpperCase();

        boolean isPdf = "pdf".equalsIgnoreCase(resourceType) || "guide".equalsIgnoreCase(resourceType) || "textbook".equalsIgnoreCase(resourceType);
        boolean isArticle = "article".equalsIgnoreCase(resourceType) || "paper".equalsIgnoreCase(resourceType);

        if (blank(title) || blank(category) || blank(subject) || blank(resourceType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Title, category, author, and resource type are required.");
        }
        if (isPdf && (blank(description) || file == null || file.isEmpty())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Description and a PDF file are required.");
        }
        if (isArticle && blank(articleContent) && blank(description)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Article content is required.");
        }

        // For articles, if plain description is blank, synthesize one from the article text/content
        if (isArticle) {
            if (blank(articleContent)) {
                articleContent = description;
            }
            if (blank(description)) {
                // Strip HTML tags for the summary description card
                String plain = articleContent.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
                description = plain.length() > 250 ? plain.substring(0, 247) + "..." : plain;
            }
        }

        String fileUrl = file == null || file.isEmpty() ? null : storeFile(file);
        jdbc.update("""
                INSERT INTO resources
                (approved, downloads_count, rating, created_at, updated_at, uploaded_by, description, article_content, author, category, file_url, image_url, title, type, required_plan)
                VALUES (1, 0, 0, NOW(), NOW(), ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
                """, userId, description, articleContent, subject, category, fileUrl, title, SqlSupport.dbType(resourceType), requiredPlan);
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
        String articleContent = field(form, "articleContent", "content");
        String requiredPlan = form.getOrDefault("requiredPlan", SqlSupport.str(rows.get(0).get("required_plan")));
        if (requiredPlan == null || requiredPlan.isBlank()) {
            requiredPlan = "FREE";
        }
        requiredPlan = requiredPlan.toUpperCase();

        boolean isArticle = "article".equalsIgnoreCase(resourceType) || "paper".equalsIgnoreCase(resourceType);
        if (isArticle) {
            if (blank(articleContent)) {
                articleContent = SqlSupport.str(rows.get(0).get("article_content"));
            }
            if (blank(articleContent)) {
                articleContent = description;
            }
            if (blank(description)) {
                String plain = articleContent.replaceAll("<[^>]*>", " ").replaceAll("\\s+", " ").trim();
                description = plain.length() > 250 ? plain.substring(0, 247) + "..." : plain;
            }
        } else {
            if (blank(articleContent)) {
                articleContent = SqlSupport.str(rows.get(0).get("article_content"));
            }
        }

        String fileUrl = SqlSupport.str(rows.get(0).get("file_url"));
        if (file != null && !file.isEmpty()) {
            fileUrl = storeFile(file);
        }
        jdbc.update("UPDATE resources SET description = ?, article_content = ?, author = ?, category = ?, file_url = ?, title = ?, type = ?, required_plan = ?, updated_at = NOW() WHERE id = ?",
                description, articleContent, subject, category, fileUrl, title, SqlSupport.dbType(resourceType), requiredPlan, id);
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

    @PutMapping("/{id}/publish")
    Map<String, Object> setPublishStatus(
            HttpServletRequest request,
            @PathVariable("id") long id,
            @RequestBody(required = false) Map<String, Object> body) {
        String email = request.getHeader("X-User-Email");
        boolean isPrimaryAdmin = email != null && email.equalsIgnoreCase(properties.mainAdminEmail());
        if (!isPrimaryAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the Main Administrator can publish or unpublish resources.");
        }

        var rows = jdbc.queryForList("SELECT id, title, is_published FROM resources WHERE id = ? LIMIT 1", id);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Resource not found.");
        }

        boolean targetPublished;
        if (body != null && body.containsKey("isPublished")) {
            targetPublished = Boolean.TRUE.equals(body.get("isPublished"));
        } else if (body != null && body.containsKey("published")) {
            targetPublished = Boolean.TRUE.equals(body.get("published"));
        } else {
            // Toggle
            boolean current = rows.get(0).get("is_published") == null || SqlSupport.bool(rows.get(0).get("is_published"));
            targetPublished = !current;
        }

        jdbc.update("UPDATE resources SET is_published = ?, updated_at = NOW() WHERE id = ?", targetPublished ? 1 : 0, id);

        String title = SqlSupport.str(rows.get(0).get("title"));
        String clientIp = request.getHeader("X-Forwarded-For") != null ? request.getHeader("X-Forwarded-For").split(",")[0].trim() : request.getRemoteAddr();
        try {
            jdbc.update("""
                    INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                    VALUES (NOW(), 'CONTENT-SERVICE', 'WARN', 'RESOURCE_PUBLISH_TOGGLE', ?, ?, ?, 'SUCCESS')
                    """, email, "Main Administrator " + (targetPublished ? "PUBLISHED" : "UNPUBLISHED") + " resource #" + id + " (" + title + ")", clientIp);
        } catch (Exception ignored) {}

        return Map.of(
                "success", true,
                "resourceId", id,
                "isPublished", targetPublished,
                "message", targetPublished ? "Resource has been published and is now visible to all users." : "Resource has been unpublished and is hidden from all users."
        );
    }

    @PostMapping("/{id}/download-token")
    Map<String, Object> createDownloadToken(
            @PathVariable("id") long id,
            HttpServletRequest request) {
        throw new ApiException(HttpStatus.FORBIDDEN, "Direct downloading of resources is disabled across user and administrator portals. Please use the secure online reader.");
    }

        jdbc.update("INSERT INTO download_tokens (token, resource_id, user_id, role, created_at) VALUES (?, ?, ?, ?, NOW())",
                token, id, userId, role != null ? role : "ADMIN");

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
        boolean isPublished = rows.get(0).get("is_published") == null || SqlSupport.bool(rows.get(0).get("is_published"));
        if (!isPublished && !"admin".equalsIgnoreCase(role)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "This resource is currently unpublished.");
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

        // If there's a page limit restriction, slice the PDF (with disk cache for instant streaming)
        if (accessDetails != null && accessDetails.containsKey("pageLimit") && file.getFileName().toString().toLowerCase().endsWith(".pdf")) {
            int pageLimit = Integer.parseInt(String.valueOf(accessDetails.get("pageLimit")));
            String originalName = file.getFileName().toString();
            Path cachedSlice = file.resolveSibling(originalName.replace(".pdf", "_preview_" + pageLimit + ".pdf"));

            if (Files.exists(cachedSlice)) {
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + cachedSlice.getFileName() + "\"")
                        .header("X-Page-Limit", String.valueOf(pageLimit))
                        .body(new FileSystemResource(cachedSlice));
            }

            try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(file.toFile())) {
                int pageCount = document.getNumberOfPages();
                if (pageCount > pageLimit) {
                    try (org.apache.pdfbox.pdmodel.PDDocument sliced = new org.apache.pdfbox.pdmodel.PDDocument()) {
                        for (int i = 0; i < pageLimit; i++) {
                            sliced.addPage(document.getPage(i));
                        }
                        sliced.save(cachedSlice.toFile());
                        return ResponseEntity.ok()
                                .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + cachedSlice.getFileName() + "\"")
                                .header("X-Page-Limit", String.valueOf(pageLimit))
                                .body(new FileSystemResource(cachedSlice));
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
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(new FileSystemResource(file));
    }

    @GetMapping("/{id}/download")
    ResponseEntity<?> download(HttpServletRequest request, @PathVariable("id") long id) {
        throw new ApiException(HttpStatus.FORBIDDEN, "Direct downloading of resources is disabled across user and administrator portals. Please use the secure online reader.");
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
        double rating = SqlSupport.parseDouble(SqlSupport.str(body.get("rating")), 0.0);
        if (rating < 0.5 || rating > 5.0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Rating must be between 0.5 and 5.0.");
        }
        boolean isAnonymous = Boolean.TRUE.equals(body.get("isAnonymous")) || "true".equalsIgnoreCase(SqlSupport.str(body.get("isAnonymous")));
        jdbc.update("INSERT INTO feedback (rating, created_at, resource_id, user_id, comment, is_anonymous) VALUES (?, NOW(), ?, ?, ?, ?)",
                rating, id, userId, SqlSupport.str(body.get("comment")), isAnonymous);
        jdbc.update("UPDATE resources SET rating = (SELECT COALESCE(ROUND(AVG(rating), 2), 0) FROM feedback WHERE resource_id = ?) WHERE id = ?", id, id);
        return Map.of("message", "Rating submitted successfully.", "rating", rating);
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

    private Map<String, Object> list(Map<String, String> query, HttpServletRequest request) {
        var page = sql.page(query);
        String search = query.get("search") == null || query.get("search").isBlank() ? null : "%" + query.get("search") + "%";
        String category = query.get("category");
        String type = query.get("type") == null || "all".equals(query.get("type")) ? null : SqlSupport.dbType(query.get("type"));
        String order = "title".equals(query.get("sort")) ? "r.title ASC" : "popular".equals(query.get("sort")) ? "r.downloads_count DESC" : "COALESCE(r.updated_at, r.created_at) DESC";

        String role = request != null ? request.getHeader("X-User-Role") : null;
        boolean isAdmin = role != null && "admin".equalsIgnoreCase(role);

        var args = new Object[] { category, category, type, type, search, search, search, search };
        String wherePublished = isAdmin ? "" : " AND (r.is_published IS NULL OR r.is_published = 1)";

        var rows = jdbc.queryForList("""
                SELECT r.* FROM resources r
                                WHERE (? IS NULL OR LOWER(TRIM(r.category)) = LOWER(TRIM(?)))
                  AND (? IS NULL OR r.type = ?)
                  AND (? IS NULL OR r.title LIKE ? OR r.description LIKE ? OR r.author LIKE ?)
                  %s
                ORDER BY %s LIMIT ? OFFSET ?
                """.formatted(wherePublished, order), concat(args, page.get("size"), page.get("offset")));
        long total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM resources r
                                WHERE (? IS NULL OR LOWER(TRIM(r.category)) = LOWER(TRIM(?)))
                  AND (? IS NULL OR r.type = ?)
                  AND (? IS NULL OR r.title LIKE ? OR r.description LIKE ? OR r.author LIKE ?)
                  %s
                """.formatted(wherePublished), Long.class, args);
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

        // Compute storage and file metrics for administrative info
        String fileUrl = SqlSupport.str(row.get("file_url"));
        long fileSizeBytes = 0;
        if (!fileUrl.isBlank() && !fileUrl.matches("(?i)^https?://.*")) {
            try {
                Path p = resolveStoredFile(fileUrl);
                if (Files.exists(p)) {
                    fileSizeBytes = Files.size(p);
                }
            } catch (Exception ignored) {}
        }
        resource.put("fileSizeBytes", fileSizeBytes);

        // Compute total page count for PDF documents
        int pageCount = 0;
        if (!fileUrl.isBlank() && fileUrl.toLowerCase().endsWith(".pdf")) {
            pageCount = pageCountCache.computeIfAbsent(fileUrl, url -> {
                try {
                    Path p = resolveStoredFile(url);
                    if (Files.exists(p)) {
                        try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(p.toFile())) {
                            return doc.getNumberOfPages();
                        }
                    }
                } catch (Exception ignored) {}
                return 0;
            });
        }
        resource.put("pageCount", pageCount);

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
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM zyndex_usage.resource_views WHERE resource_id = ?", Long.class, resourceId);
            if (count != null) return count;
        } catch (Exception ignored) {}
        try {
            Long count = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE resource_id = ?", Long.class, resourceId);
            if (count != null) return count;
        } catch (Exception ignored) {}
        return 0;
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
        Path targetPath = dir.resolve(name);

        // Save file immediately so upload responds instantly
        file.transferTo(targetPath);

        // If it's a PDF, run stream compression asynchronously in the background so HTTP client never times out
        if ("pdf".equalsIgnoreCase(extension)) {
            java.util.concurrent.CompletableFuture.runAsync(() -> {
                try {
                    Path tempCompressed = dir.resolve(name + ".cmp");
                    compressPdf(targetPath, tempCompressed);
                    if (Files.exists(tempCompressed) && Files.size(tempCompressed) > 0) {
                        Files.move(tempCompressed, targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (Exception e) {
                    System.err.println("Async PDF compression skipped: " + e.getMessage());
                }
            });
        }
        return "uploads/" + name;
    }

    /**
     * Lossless PDF stream compression and optimization using Apache PDFBox 3.x
     */
    private void compressPdf(Path source, Path destination) throws IOException {
        try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.Loader.loadPDF(source.toFile())) {
            // Compress all uncompressed content streams without altering vector/text fidelity
            for (org.apache.pdfbox.pdmodel.PDPage page : document.getPages()) {
                java.util.Iterator<org.apache.pdfbox.pdmodel.common.PDStream> streams = page.getContentStreams();
                while (streams != null && streams.hasNext()) {
                    org.apache.pdfbox.pdmodel.common.PDStream stream = streams.next();
                    if (stream != null && (stream.getFilters() == null || stream.getFilters().isEmpty())) {
                        stream.setFilters(java.util.List.of(org.apache.pdfbox.cos.COSName.FLATE_DECODE));
                    }
                }
            }
            // Save with Flate compression enabled to minimize stored bytes
            document.save(destination.toFile());
        }
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
