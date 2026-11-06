package com.zyndex.usage;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usage")
public class UsageController {

    private final JdbcTemplate jdbc;

    public UsageController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostMapping("/events")
    public Map<String, Object> logEvent(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body.get("userId"));
        Long resourceId = getLong(body.get("resourceId"));
        String eventType = String.valueOf(body.getOrDefault("eventType", "VIEW")).toUpperCase();

        if (userId == null || resourceId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId and resourceId are required.");
        }

        if ("DOWNLOAD".equals(eventType)) {
            jdbc.update("INSERT INTO downloads (resource_id, user_id, downloaded_at) VALUES (?, ?, NOW())", resourceId, userId);
        } else {
            jdbc.update("INSERT INTO resource_views (resource_id, user_id, viewed_at) VALUES (?, ?, NOW())", resourceId, userId);
            // Deduplicate usages: only insert an initial 1-minute tracking row if user doesn't already have a view on this resource in the last 15 minutes
            Integer countRecent = jdbc.queryForObject(
                "SELECT COUNT(*) FROM usages WHERE user_id = ? AND content_id = ? AND created_at >= NOW() - INTERVAL 15 MINUTE",
                Integer.class, userId, resourceId);
            if (countRecent == null || countRecent == 0) {
                jdbc.update("INSERT INTO usages (user_id, content_id, duration) VALUES (?, ?, 1)", userId, resourceId);
            }
        }

        return Map.of("message", "Usage event logged successfully.");
    }

    @GetMapping("/downloads/user/{userId}")
    public Map<String, Object> getUserDownloads(
            @PathVariable("userId") long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        int offset = page * size;
        var rows = jdbc.queryForList("""
                SELECT resource_id, downloaded_at
                FROM downloads WHERE user_id = ? ORDER BY downloaded_at DESC LIMIT ? OFFSET ?
                """, userId, size, offset);
        long total = jdbc.queryForObject("SELECT COUNT(*) FROM downloads WHERE user_id = ?", Long.class, userId);

        return Map.of("resources", rows, "totalElements", total);
    }

    @GetMapping("/views/user/{userId}")
    public Map<String, Object> getUserViews(
            @PathVariable("userId") long userId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {
        int offset = page * size;
        var rows = jdbc.queryForList("""
            SELECT rv.resource_id, rv.viewed_at
            FROM resource_views rv
            INNER JOIN (
                SELECT resource_id, MAX(viewed_at) AS latest_viewed_at
                FROM resource_views WHERE user_id = ? GROUP BY resource_id
            ) latest ON latest.resource_id = rv.resource_id AND latest.latest_viewed_at = rv.viewed_at
            WHERE rv.user_id = ? ORDER BY rv.viewed_at DESC LIMIT ? OFFSET ?
                """, userId, size, offset);
        long total = jdbc.queryForObject("SELECT COUNT(DISTINCT resource_id) FROM resource_views WHERE user_id = ?", Long.class, userId);

        return Map.of("resources", rows, "totalElements", total);
    }

    @GetMapping("/views/count")
    public long getViewCount(@RequestParam("resourceId") long resourceId) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE resource_id = ?", Long.class, resourceId);
        return count != null ? count : 0;
    }

    @GetMapping("/stats/user/{userId}")
    public Map<String, Object> getUserStats(@PathVariable("userId") long userId) {
        long downloads = jdbc.queryForObject("SELECT COUNT(*) FROM downloads WHERE user_id = ?", Long.class, userId);
        long views = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views WHERE user_id = ?", Long.class, userId);
        return Map.of("downloads", downloads, "views", views);
    }

    @GetMapping("/views/user/{userId}/today")
    public Map<String, Object> getViewsToday(@PathVariable("userId") long userId) {
        List<Long> resourceIds = jdbc.queryForList("""
                SELECT DISTINCT resource_id 
                FROM resource_views 
                WHERE user_id = ? AND viewed_at >= CURRENT_DATE()
                """, Long.class, userId);
        return Map.of("count", resourceIds.size(), "resourceIds", resourceIds);
    }

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics() {
        long totalDownloads = jdbc.queryForObject("SELECT COUNT(*) FROM downloads", Long.class);
        long totalViews = jdbc.queryForObject("SELECT COUNT(*) FROM resource_views", Long.class);
        List<Map<String, Object>> popularDownloads = jdbc.queryForList("""
                SELECT resource_id, COUNT(*) AS count
                FROM downloads GROUP BY resource_id ORDER BY count DESC LIMIT 10
                """);
        List<Map<String, Object>> popularViews = jdbc.queryForList("""
                SELECT resource_id, COUNT(*) AS count
                FROM resource_views GROUP BY resource_id ORDER BY count DESC LIMIT 10
                """);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalDownloads", totalDownloads);
        metrics.put("totalViews", totalViews);
        metrics.put("popularDownloads", popularDownloads);
        metrics.put("popularViews", popularViews);
        return metrics;
    }

    @PostMapping("/records")
    public Map<String, Object> logDuration(@RequestBody Map<String, Object> body) {
        Long userId = getLong(body.get("userId"));
        Long contentId = getLong(body.get("contentId"));
        if (contentId == null) {
            contentId = getLong(body.get("resourceId"));
        }
        Integer duration = body.get("duration") != null ? Integer.parseInt(String.valueOf(body.get("duration"))) : 0;

        if (userId == null || contentId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId and contentId are required.");
        }

        jdbc.update("INSERT INTO usages (user_id, content_id, duration) VALUES (?, ?, ?)", userId, contentId, duration);
        return Map.of("message", "Reading duration logged successfully.");
    }

    @GetMapping("/records/user/{userId}")
    public List<Map<String, Object>> getUserRecords(@PathVariable("userId") long userId) {
        return jdbc.queryForList("SELECT usage_id, user_id, content_id, duration, created_at FROM usages WHERE user_id = ? ORDER BY created_at DESC", userId);
    }

    @GetMapping("/engagement/analytics")
    public Map<String, Object> getEngagementAnalytics() {
        Long totalMinutes = jdbc.queryForObject("SELECT COALESCE(SUM(duration), 0) FROM usages", Long.class);
        Long totalSessions = jdbc.queryForObject("SELECT COUNT(*) FROM usages", Long.class);
        Long uniqueReaders = jdbc.queryForObject("SELECT COUNT(DISTINCT user_id) FROM usages", Long.class);
        
        // Active readers today (from today's reading events or users active within last 24 hours)
        Long todayReaders = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT user_id) FROM (
                    SELECT user_id FROM usages WHERE created_at >= CURRENT_DATE()
                    UNION
                    SELECT id AS user_id FROM zyndex_auth.users WHERE last_active_at >= NOW() - INTERVAL 24 HOUR
                ) active_users
                """, Long.class);

        // Real-time active reading sessions right now: only count users who actually logged reading activity within the last 15 minutes
        Long activeSessionsNow = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT user_id) FROM usages 
                WHERE created_at >= NOW() - INTERVAL 15 MINUTE
                """, Long.class);

        long avgMinutes = (totalSessions != null && totalSessions > 0) ? (totalMinutes / totalSessions) : 0L;

        List<Map<String, Object>> trendData = jdbc.queryForList("""
                SELECT 
                    DATE_FORMAT(created_at, '%H:00') AS timeLabel,
                    COALESCE(SUM(duration), 0) AS durationMinutes,
                    COUNT(DISTINCT user_id) AS activeReaders,
                    COUNT(*) AS sessionCount
                FROM usages
                WHERE created_at >= NOW() - INTERVAL 24 HOUR
                GROUP BY DATE_FORMAT(created_at, '%H:00')
                ORDER BY MIN(created_at) ASC
                LIMIT 12
                """);

        // Live breakdown of reading minutes by content category from real records
        List<Map<String, Object>> categoryBreakdown = new ArrayList<>();
        try {
            categoryBreakdown = jdbc.queryForList("""
                    SELECT 
                        COALESCE(res.category, 'General Academics') AS name,
                        COALESCE(SUM(u.duration), 0) AS minutes,
                        COUNT(DISTINCT u.user_id) AS readers,
                        COUNT(*) AS sessions
                    FROM zyndex_usage.usages u
                    LEFT JOIN zyndex_content.resources res ON res.id = u.content_id
                    GROUP BY COALESCE(res.category, 'General Academics')
                    ORDER BY minutes DESC
                    LIMIT 8
                    """);
        } catch (Exception e) {
            System.err.println("Category breakdown query failed: " + e.getMessage());
        }

        // Live breakdown of active readers by user role / tier
        List<Map<String, Object>> tierBreakdown = new ArrayList<>();
        try {
            tierBreakdown = jdbc.queryForList("""
                    SELECT 
                        COALESCE(usr.role, 'STUDENT') AS tier,
                        COUNT(DISTINCT u.user_id) AS readers,
                        COALESCE(SUM(u.duration), 0) AS totalMinutes
                    FROM zyndex_usage.usages u
                    LEFT JOIN zyndex_auth.users usr ON usr.id = u.user_id
                    GROUP BY COALESCE(usr.role, 'STUDENT')
                    ORDER BY readers DESC
                    """);
        } catch (Exception e) {
            System.err.println("Tier breakdown query failed: " + e.getMessage());
        }

        // Recent live active reading sessions
        List<Map<String, Object>> recentSessions = new ArrayList<>();
        try {
            recentSessions = jdbc.queryForList("""
                    SELECT 
                        u.usage_id AS usageId,
                        u.user_id AS userId,
                        COALESCE(usr.username, CONCAT('Scholar #', u.user_id)) AS userName,
                        COALESCE(usr.email, 'student@zyndex.com') AS userEmail,
                        COALESCE(res.title, CONCAT('Academic Resource #', u.content_id)) AS title,
                        COALESCE(res.category, 'General Academics') AS category,
                        COALESCE(res.type, 'TEXTBOOK') AS type,
                        u.duration AS durationMinutes,
                        u.created_at AS timestamp
                    FROM zyndex_usage.usages u
                    LEFT JOIN zyndex_content.resources res ON res.id = u.content_id
                    LEFT JOIN zyndex_auth.users usr ON usr.id = u.user_id
                    ORDER BY u.created_at DESC
                    LIMIT 10
                    """);
        } catch (Exception e) {
            System.err.println("Recent sessions query failed: " + e.getMessage());
        }

        return Map.of(
                "totalReadingMinutes", totalMinutes != null ? totalMinutes : 0L,
                "totalSessions", totalSessions != null ? totalSessions : 0L,
                "totalReaders", uniqueReaders != null ? uniqueReaders : 0L,
                "activeReadersToday", activeSessionsNow != null && activeSessionsNow > 0 ? activeSessionsNow : (todayReaders != null ? todayReaders : 0L),
                "activeSessionsNow", activeSessionsNow != null ? activeSessionsNow : 0L,
                "avgSessionMinutes", avgMinutes,
                "trendData", trendData,
                "categoryBreakdown", categoryBreakdown,
                "tierBreakdown", tierBreakdown,
                "recentSessions", recentSessions
        );
    }

    @GetMapping("/history/live")
    public Map<String, Object> getLiveReadingHistory(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        
        int offset = page * size;
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT 
                    u.usage_id AS usageId,
                    u.user_id AS userId,
                    COALESCE(usr.username, CONCAT('Scholar #', u.user_id)) AS userName,
                    COALESCE(usr.email, 'student@zyndex.com') AS userEmail,
                    u.content_id AS contentId,
                    COALESCE(res.title, c.title, CONCAT('Academic Resource #', u.content_id)) AS title,
                    COALESCE(res.type, c.type, 'TEXTBOOK') AS type,
                    COALESCE(res.author, c.author, 'Zyndex Faculty') AS author,
                    COALESCE(res.category, 'General Academics') AS category,
                    u.duration AS durationMinutes,
                    COALESCE(acc.access_status, 'ACTIVE') AS accessStatus,
                    u.created_at AS timestamp,
                    DATE_SUB(u.created_at, INTERVAL u.duration MINUTE) AS startTime,
                    u.created_at AS endTime
                FROM zyndex_usage.usages u
                LEFT JOIN zyndex_content.resources res ON res.id = u.content_id
                LEFT JOIN zyndex_content.content c ON c.content_id = u.content_id
                LEFT JOIN zyndex_auth.users usr ON usr.id = u.user_id
                LEFT JOIN zyndex_access.access acc ON (acc.user_id = u.user_id AND acc.content_id = u.content_id)
                ORDER BY u.created_at DESC
                LIMIT ? OFFSET ?
                """, size, offset);

        Long total = jdbc.queryForObject("SELECT COUNT(*) FROM usages", Long.class);

        return Map.of(
                "records", rows,
                "total", total != null ? total : 0L,
                "page", page,
                "size", size
        );
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
