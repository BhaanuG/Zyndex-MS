package com.zyndex.subscription;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class SubscriptionAuditLoggingFilter implements Filter {

    private final JdbcTemplate jdbc;

    public SubscriptionAuditLoggingFilter(JdbcTemplate jdbc) {
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

            String action = "SUBSCRIPTION_" + method;
            String details = "Billing / Subscription event on " + uri + " (" + (req.getQueryString() != null ? req.getQueryString() : "direct") + ")";

            if (uri.contains("/verify")) {
                action = "PAYMENT_ADMIN_VERIFIED";
                details = "Administrator executed verification or reconciliation action on payment record via " + uri;
            } else if (uri.contains("/payments")) {
                action = "PAYMENT_" + method;
                details = "Payment verification or invoice generation operation processed on " + uri;
            } else if (uri.contains("/webhook")) {
                action = "PAYMENT_WEBHOOK";
                details = "Automated UPI / Gateway payment webhook callback received from " + ip;
            } else if (uri.contains("/plans")) {
                action = "PLANS_QUERY";
                details = "Subscription tier catalogue and pricing fetched on " + uri;
            }

            try {
                jdbc.update("""
                        INSERT INTO zyndex_auth.system_logs (timestamp, service, level, action, actor_email, details, ip_address, status)
                        VALUES (NOW(), 'SUBSCRIPTION-SERVICE', 'INFO', ?, ?, ?, ?, 'SUCCESS')
                        """, action, actorEmail, details, ip);
            } catch (Exception ignored) {}
        }
    }
}
