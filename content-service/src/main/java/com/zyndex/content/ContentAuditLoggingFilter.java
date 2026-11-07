package com.zyndex.content;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class ContentAuditLoggingFilter implements Filter {

    private final JdbcTemplate jdbc;

    public ContentAuditLoggingFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;
        String uri = req.getRequestURI();
        String method = req.getMethod();

        chain.doFilter(request, response);

        // Record meaningful operations asynchronously into zyndex_auth.system_logs
        if (!"OPTIONS".equalsIgnoreCase(method) && !uri.contains("/health") && !uri.contains("/actuator")) {
            String actorEmail = req.getHeader("X-User-Email");
            if (actorEmail == null || actorEmail.isBlank()) actorEmail = "system";
            String ip = req.getRemoteAddr();

            String action = method + " " + uri;
            String details = "Content service processed " + method + " request on " + uri + " (" + req.getContentType() + ", Query: " + (req.getQueryString() != null ? req.getQueryString() : "none") + ")";

            if (uri.contains("/feedback")) {
                action = "FEEDBACK_" + method;
                details = "User feedback operation executed on " + uri + " [Method: " + method + ", Client IP: " + ip + "]";
            } else if (uri.contains("/rate")) {
                action = "RESOURCE_RATED";
                details = "Resource rating and reader review submitted on " + uri;
            } else if (uri.contains("/download")) {
                action = "RESOURCE_DOWNLOAD";
                details = "Resource secure download token or document file streamed to reader client (" + uri + ")";
            } else if (uri.contains("/resources") && ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method))) {
                action = "RESOURCE_" + method;
                details = "Catalog resource mutation operation (" + method + ") performed on " + uri;
            } else if (uri.contains("/resources") && "GET".equalsIgnoreCase(method)) {
                action = "CATALOG_SEARCH_QUERY";
                details = "Catalog queries or textbook details fetched via " + uri + (req.getQueryString() != null ? "?" + req.getQueryString() : "");
            }

            try {
                jdbc.update("""
                        INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                        VALUES (NOW(), 'CONTENT-SERVICE', 'INFO', ?, ?, ?, ?, 'SUCCESS')
                        """, action, actorEmail, details, ip);
            } catch (Exception ignored) {}
        }
    }
}
