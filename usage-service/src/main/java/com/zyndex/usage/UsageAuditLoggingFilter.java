package com.zyndex.usage;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class UsageAuditLoggingFilter implements Filter {

    private final JdbcTemplate jdbc;

    public UsageAuditLoggingFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String uri = req.getRequestURI();
        String method = req.getMethod();
        long startTime = System.currentTimeMillis();

        chain.doFilter(request, response);

        long responseTimeMs = System.currentTimeMillis() - startTime;

        if (!"OPTIONS".equalsIgnoreCase(method) && !uri.contains("/health") && !uri.contains("/actuator")) {
            String actorEmail = req.getHeader("X-User-Email");
            if (actorEmail == null || actorEmail.isBlank()) actorEmail = "system";
            String ip = req.getRemoteAddr();

            String action = "USAGE_" + method;
            String details = "Usage metrics interaction on " + uri + " (" + (req.getQueryString() != null ? req.getQueryString() : "no query params") + ")";

            if (uri.contains("/records") && "POST".equalsIgnoreCase(method)) {
                action = "USAGE_RECORDED";
                details = "Reading session duration interval recorded and persisted in MySQL [Client IP: " + ip + "]";
            } else if (uri.contains("/analytics")) {
                action = "USAGE_ANALYTICS_QUERY";
                details = "Engagement analytics metrics and trends queried by administrator on " + uri;
            } else if (uri.contains("/history")) {
                action = "USAGE_HISTORY_QUERY";
                details = "Student reading history and session activity telemetry records queried on " + uri;
            }

            try {
                jdbc.update("""
                        INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status, response_time_ms)
                        VALUES (NOW(), 'USAGE-SERVICE', 'INFO', ?, ?, ?, ?, 'SUCCESS', ?)
                        """, action, actorEmail, details, ip, responseTimeMs);
            } catch (Exception ignored) {}
        }
    }
}
