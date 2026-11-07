package com.zyndex.access;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class AccessAuditLoggingFilter implements Filter {

    private final JdbcTemplate jdbc;

    public AccessAuditLoggingFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String uri = req.getRequestURI();
        String method = req.getMethod();

        chain.doFilter(request, response);

        if (!"OPTIONS".equalsIgnoreCase(method) && !uri.contains("/health") && !uri.contains("/actuator")) {
            String actorEmail = req.getHeader("X-User-Email");
            if (actorEmail == null || actorEmail.isBlank()) actorEmail = "system";
            String ip = req.getRemoteAddr();

            String action = "ACCESS_CHECK_" + method;
            String details = "Access authorization check on " + uri + " [User: " + actorEmail + ", Client IP: " + ip + "]";

            if (uri.contains("/entitlements")) {
                action = "ACCESS_ENTITLEMENT_CHECK";
                details = "User resource access entitlement and subscription tier validation queried on " + uri;
            }

            try {
                jdbc.update("""
                        INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                        VALUES (NOW(), 'ACCESS-SERVICE', 'INFO', ?, ?, ?, ?, 'SUCCESS')
                        """, action, actorEmail, details, ip);
            } catch (Exception ignored) {}
        }
    }
}
