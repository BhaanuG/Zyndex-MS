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

        StringBuilder whereSql = new StringBuilder(" WHERE 1=1 ");
        List<Object> params = new ArrayList<>();

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

        String dataQuery = "SELECT id, timestamp, service, level, action, actor_email, details, ip_address, status " +
                " FROM system_logs " + whereSql + " ORDER BY id DESC LIMIT ? OFFSET ?";
        
        List<Object> dataParams = new ArrayList<>(params);
        dataParams.add(page.get("size"));
        dataParams.add(page.get("offset"));

        var rows = jdbc.queryForList(dataQuery, dataParams.toArray());

        // Compute summary counts
        Long totalAll = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs", Long.class);
        Long errors = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs WHERE level = 'ERROR'", Long.class);
        Long warnings = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs WHERE level = 'WARN'", Long.class);
        Long info = jdbc.queryForObject("SELECT COUNT(*) FROM system_logs WHERE level = 'INFO'", Long.class);

        return Map.of(
                "logs", rows.stream().map(row -> Map.of(
                        "id", row.get("id"),
                        "timestamp", row.get("timestamp") != null ? row.get("timestamp").toString() : "",
                        "service", row.get("service") != null ? row.get("service") : "",
                        "level", row.get("level") != null ? row.get("level") : "INFO",
                        "action", row.get("action") != null ? row.get("action") : "",
                        "actorEmail", row.get("actor_email") != null ? row.get("actor_email") : "system",
                        "details", row.get("details") != null ? row.get("details") : "",
                        "ipAddress", row.get("ip_address") != null ? row.get("ip_address") : "127.0.0.1",
                        "status", row.get("status") != null ? row.get("status") : "SUCCESS"
                )).toList(),
                "total", total != null ? total : 0L,
                "page", page.get("page"),
                "size", page.get("size"),
                "stats", Map.of(
                        "totalLogs", totalAll != null ? totalAll : 0L,
                        "errorCount", errors != null ? errors : 0L,
                        "warnCount", warnings != null ? warnings : 0L,
                        "infoCount", info != null ? info : 0L
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

        if (service.isBlank()) service = "SYSTEM";
        if (level.isBlank()) level = "INFO";
        if (action.isBlank()) action = "EVENT";
        if (status.isBlank()) status = "SUCCESS";

        jdbc.update(
                "INSERT INTO system_logs (timestamp, service, level, action, actor_email, details, ip_address, status) " +
                        "VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)",
                service, level.toUpperCase(), action, actorEmail, details, ipAddress, status
        );

        return Map.of("message", "Log recorded successfully.");
    }
}
