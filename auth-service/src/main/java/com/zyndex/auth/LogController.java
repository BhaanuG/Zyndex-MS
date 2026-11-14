package com.zyndex.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final JdbcTemplate jdbc;
    private final AuthSupport auth;
    private final SqlSupport sql;

    public LogController(JdbcTemplate jdbc, AuthSupport auth, SqlSupport sql) {
        this.jdbc = jdbc;
        this.auth = auth;
        this.sql = sql;
    }

    @GetMapping
    public Map<String, Object> listLogs(
            HttpServletRequest request,
            @RequestParam Map<String, String> query) {
        
        // Admin authorization
        auth.requireRole(auth.requireUser(request), "admin");

        var page = sql.page(query);
        String service = query.getOrDefault("service", "").trim();
        String level = query.getOrDefault("level", "").trim();
        String search = query.getOrDefault("search", "").trim();
        String category = query.getOrDefault("category", "").trim(); // "admin" | "system" | ""

        StringBuilder whereSql = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

        if ("admin".equalsIgnoreCase(category)) {
            whereSql.append(" AND (service = 'ADMIN-PORTAL' OR action LIKE 'ADMIN_%' OR actor_email LIKE '%admin%' OR actor_email = 'Bhaanugali@gmail.com' OR actor_email IN (SELECT email FROM users WHERE role = 'ADMIN' OR is_primary_admin = 1)) ");
        }

        if (!service.isBlank() && !"ALL".equalsIgnoreCase(service)) {
            whereSql.append(" AND service = ? ");
            params.add(service);
        }

        if (!level.isBlank() && !"ALL".equalsIgnoreCase(level)) {
            whereSql.append(" AND level = ? ");
            params.add(level.toUpperCase());
        }

        if (!search.isBlank()) {
            whereSql.append(" AND (action LIKE ? OR details LIKE ? OR actor_email LIKE ?) ");
            String likePattern = "%" + search + "%";
            params.add(likePattern);
            params.add(likePattern);
            params.add(likePattern);
        }

        String countQuery = "SELECT COUNT(*) FROM system_logs " + whereSql;
        Long total = jdbc.queryForObject(countQuery, Long.class, params.toArray());

        String sort = query.getOrDefault("sort", "").trim();
        String orderByClause = " ORDER BY id DESC ";
        if ("timestamp_asc".equalsIgnoreCase(sort) || "time_asc".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY id ASC ";
        } else if ("level_desc".equalsIgnoreCase(sort) || "severity".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY FIELD(level, 'ERROR', 'WARN', 'INFO', 'SUCCESS'), id DESC ";
        } else if ("level_asc".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY FIELD(level, 'SUCCESS', 'INFO', 'WARN', 'ERROR'), id DESC ";
        } else if ("latency_desc".equalsIgnoreCase(sort) || "slowest".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY response_time_ms DESC, id DESC ";
        } else if ("latency_asc".equalsIgnoreCase(sort) || "fastest".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY response_time_ms ASC, id DESC ";
        } else if ("service_asc".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY service ASC, id DESC ";
        } else if ("actor_asc".equalsIgnoreCase(sort)) {
            orderByClause = " ORDER BY actor_email ASC, id DESC ";
        }

        String dataQuery = "SELECT id, DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS formatted_time, timestamp, service, level, action, actor_email, details, ip_address, status, response_time_ms " +
                " FROM system_logs " + whereSql + orderByClause + " LIMIT ? OFFSET ?";
        
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(page.get("size"));
        dataParams.add(page.get("offset"));

        var rows = jdbc.queryForList(dataQuery, dataParams.toArray());

        // Compute summary counts scoped strictly to current category or query
        String scopeCondition = "";
        if ("admin".equalsIgnoreCase(category)) {
            scopeCondition = " WHERE (service = 'ADMIN-PORTAL' OR action LIKE 'ADMIN_%' OR actor_email LIKE '%admin%' OR actor_email = 'Bhaanugali@gmail.com' OR actor_email IN (SELECT email FROM users WHERE role = 'ADMIN' OR is_primary_admin = 1)) ";
        } else if ("system".equalsIgnoreCase(category)) {
            scopeCondition = "";
        }

        // Single aggregated SQL query to compute all summary counts in 1 roundtrip
        String statsSql = "SELECT " +
                "COUNT(*) AS total_category, " +
                "SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) AS error_count, " +
                "SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) AS warn_count, " +
                "SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) AS info_count, " +
                "SUM(CASE WHEN level = 'SUCCESS' THEN 1 ELSE 0 END) AS success_count " +
                "FROM system_logs " + scopeCondition;

        var statsRow = jdbc.queryForMap(statsSql);
        Long totalCategoryLogs = statsRow.get("total_category") != null ? ((Number) statsRow.get("total_category")).longValue() : 0L;
        Long errors = statsRow.get("error_count") != null ? ((Number) statsRow.get("error_count")).longValue() : 0L;
        Long warnings = statsRow.get("warn_count") != null ? ((Number) statsRow.get("warn_count")).longValue() : 0L;
        Long info = statsRow.get("info_count") != null ? ((Number) statsRow.get("info_count")).longValue() : 0L;
        Long success = statsRow.get("success_count") != null ? ((Number) statsRow.get("success_count")).longValue() : 0L;

        Long totalAdmin = "admin".equalsIgnoreCase(category) ? totalCategoryLogs : jdbc.queryForObject("SELECT COUNT(*) FROM system_logs WHERE service = 'ADMIN-PORTAL'", Long.class);
        Long totalOverall = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs", Long.class);

        // Fetch distinct services present in database for dynamic dropdown listing
        List<String> distinctServices = jdbc.queryForList("SELECT DISTINCT service FROM system_logs WHERE service IS NOT NULL AND service != '' ORDER BY service ASC", String.class);

        return Map.of(
                "logs", rows.stream().map(row -> Map.of(
                        "id", row.get("id"),
                        "timestamp", row.get("formatted_time") != null ? row.get("formatted_time").toString() : (row.get("timestamp") != null ? row.get("timestamp").toString() : ""),
                        "service", row.get("service") != null ? row.get("service") : "",
                        "level", row.get("level") != null ? row.get("level") : "INFO",
                        "action", row.get("action") != null ? row.get("action") : "",
                        "actorEmail", row.get("actor_email") != null ? row.get("actor_email") : "system",
                        "details", row.get("details") != null ? row.get("details") : "",
                        "ipAddress", row.get("ip_address") != null ? row.get("ip_address") : "127.0.0.1",
                        "status", row.get("status") != null ? row.get("status") : "SUCCESS",
                        "responseTimeMs", row.get("response_time_ms") != null ? row.get("response_time_ms") : 0
                )).toList(),
                "total", total != null ? total : 0L,
                "page", page.get("page"),
                "size", page.get("size"),
                "availableServices", distinctServices,
                "stats", Map.of(
                        "totalLogs", totalCategoryLogs != null ? totalCategoryLogs : 0L,
                        "overallLogs", totalOverall != null ? totalOverall : 0L,
                        "adminLogsCount", totalAdmin != null ? totalAdmin : 0L,
                        "errorCount", errors != null ? errors : 0L,
                        "warnCount", warnings != null ? warnings : 0L,
                        "infoCount", info != null ? info : 0L,
                        "successCount", success != null ? success : 0L
                )
        );
    }

    @PostMapping
    public Map<String, Object> createLog(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        
        String service = AuthSupport.str(body.get("service"));
        String level = AuthSupport.str(body.get("level"));
        String action = AuthSupport.str(body.get("action"));
        String actorEmail = AuthSupport.str(body.get("actorEmail"));
        String details = AuthSupport.str(body.get("details"));
        String ipAddress = request.getRemoteAddr();
        String status = AuthSupport.str(body.get("status"));
        Integer responseTimeMs = body.get("responseTimeMs") != null ? ((Number) body.get("responseTimeMs")).intValue() : (body.get("durationMs") != null ? ((Number) body.get("durationMs")).intValue() : null);

        if (service.isBlank()) service = "SYSTEM";
        if (level.isBlank()) level = "INFO";
        if (action.isBlank()) action = "EVENT";
        if (status.isBlank()) status = "SUCCESS";

        jdbc.update(
                "INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status, response_time_ms) " +
                        "VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)",
                service, level.toUpperCase(), action, actorEmail, details, ipAddress, status, responseTimeMs
        );

        return Map.of("message", "Log recorded successfully.");
    }
}
