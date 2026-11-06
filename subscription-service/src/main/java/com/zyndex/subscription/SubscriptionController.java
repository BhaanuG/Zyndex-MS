package com.zyndex.subscription;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;
    private final PaymentService paymentService;

    @Value("${payment.mode:UPI_DIRECT}")
    private String paymentMode;

    @Value("${zyndex.otp-mail-from:}")
    private String mailFrom;

    public SubscriptionController(
            JdbcTemplate jdbc,
            RestTemplate restTemplate,
            PaymentService paymentService) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
        this.paymentService = paymentService;
    }

    @GetMapping("/plans")
    public List<Map<String, Object>> getPlans() {
        return jdbc.queryForList("SELECT * FROM plans WHERE active = TRUE ORDER BY price_paise ASC");
    }

    private Long getLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException error) {
            return null;
        }
    }

    @PostMapping("/admin/sync")
    public Map<String, Object> syncAdminSubscription(
            HttpServletRequest request,
            @RequestBody Map<String, Object> body) {
        if (!"auth-service".equalsIgnoreCase(request.getHeader("X-Internal-Service"))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Internal subscription synchronization is restricted.");
        }

        Long userId = getLong(body.get("userId"));
        String planId = String.valueOf(body.getOrDefault("plan", "FREE")).toUpperCase();
        int durationDays = body.get("durationDays") == null
                ? 30
                : Integer.parseInt(String.valueOf(body.get("durationDays")));
        if (userId == null || userId <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "userId is required.");
        }
        if (durationDays <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "durationDays must be greater than zero.");
        }
        if ("FREE".equals(planId)) {
            durationDays = 36500;
        }

        List<Map<String, Object>> plans = jdbc.queryForList(
                "SELECT id FROM plans WHERE id = ? AND active = TRUE", planId);
        if (plans.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive plan selection.");
        }

        try {
            syncAccessSubscription(userId, planId, durationDays);
        } catch (Exception error) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Access entitlement synchronization failed.");
        }

        String previousPlan = currentPlan(userId);
        jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);
        String subscriptionId = "ADMIN_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        jdbc.update(
                "INSERT INTO subscriptions (id, user_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), FALSE)",
                subscriptionId, userId, planId, durationDays);

        Map<String, Object> subscription = jdbc.queryForMap(
                "SELECT s.id, s.user_id, s.plan_id, s.status, s.start_date, s.end_date, p.name AS plan_name, p.billing_interval "
                        + "FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.id = ?", subscriptionId);
        String exactNow = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        boolean notificationEmailSent = sendPlanUpgradeEmail(
                userId, previousPlan, planId, subscription.get("start_date"), subscription.get("end_date"),
                subscriptionId, "ADMIN_SYNC", exactNow, "SUCCESS");
        return Map.of(
                "message", "Subscription synchronized successfully.",
                "notificationEmailSent", notificationEmailSent,
                "subscription", subscription);
    }

    @GetMapping("/me")
    public Map<String, Object> getMySubscription(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> subs = jdbc.queryForList(
                "SELECT s.*, p.name as plan_name, p.price_paise, p.currency, p.billing_interval FROM subscriptions s " +
                "JOIN plans p ON s.plan_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1", 
                userId
        );

        if (subs.isEmpty()) {
            return buildFreeSubscriptionResponse();
        }

        Map<String, Object> sub = subs.get(0);
        String status = String.valueOf(sub.get("status")).toUpperCase();
        Object endObj = sub.get("end_date");
        Instant endInstant = null;

        if (endObj instanceof java.sql.Timestamp) {
            endInstant = ((java.sql.Timestamp) endObj).toInstant();
        } else if (endObj instanceof LocalDateTime) {
            endInstant = ((LocalDateTime) endObj).toInstant(ZoneOffset.UTC);
        } else if (endObj instanceof Instant) {
            endInstant = (Instant) endObj;
        }

        boolean isExpired = endInstant != null && Instant.now().isAfter(endInstant);

        if (isExpired && ("ACTIVE".equals(status) || "CANCELLED".equals(status))) {
            try {
                jdbc.update("UPDATE subscriptions SET status = 'EXPIRED' WHERE id = ?", sub.get("id"));
            } catch (Exception ignored) {}
            status = "EXPIRED";
        }

        // If expired or revoked, resolve to FREE according to business rules
        if (isExpired || "REVOKED".equals(status) || "EXPIRED".equals(status) || "FREE".equals(status)) {
            return buildFreeSubscriptionResponse();
        }

        String planId = String.valueOf(sub.get("plan_id"));
        String planName = String.valueOf(sub.get("plan_name"));
        long pricePaise = sub.get("price_paise") != null ? ((Number) sub.get("price_paise")).longValue() : 0L;
        String currency = sub.get("currency") != null ? String.valueOf(sub.get("currency")) : "INR";
        String billingInterval = sub.get("billing_interval") != null ? String.valueOf(sub.get("billing_interval")) : "MONTH";
        boolean autoRenew = Boolean.TRUE.equals(sub.get("auto_renew"));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("id", sub.get("id"));
        res.put("userId", sub.get("user_id"));
        res.put("planId", planId);
        res.put("plan_id", planId);
        res.put("planName", planName);
        res.put("plan_name", planName);
        res.put("status", status);
        res.put("price", pricePaise / 100.0);
        res.put("pricePaise", pricePaise);
        res.put("price_paise", pricePaise);
        res.put("currency", currency);
        res.put("billingInterval", billingInterval);
        res.put("billing_interval", billingInterval);
        res.put("startDate", sub.get("start_date") != null ? sub.get("start_date").toString() : null);
        res.put("start_date", sub.get("start_date") != null ? sub.get("start_date").toString() : null);
        res.put("endDate", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("end_date", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("expiresAt", sub.get("end_date") != null ? sub.get("end_date").toString() : null);
        res.put("autoRenew", autoRenew);
        res.put("auto_renew", autoRenew);
        return res;
    }

    private Map<String, Object> buildFreeSubscriptionResponse() {
        Map<String, Object> free = new LinkedHashMap<>();
        free.put("id", null);
        free.put("planId", "FREE");
        free.put("plan_id", "FREE");
        free.put("planName", "Free / Demo");
        free.put("plan_name", "Free / Demo");
        free.put("status", "FREE");
        free.put("price", 0.0);
        free.put("pricePaise", 0L);
        free.put("price_paise", 0L);
        free.put("currency", "INR");
        free.put("billingInterval", "Forever");
        free.put("billing_interval", "Forever");
        free.put("startDate", null);
        free.put("start_date", null);
        free.put("endDate", null);
        free.put("end_date", null);
        free.put("expiresAt", null);
        free.put("autoRenew", false);
        free.put("auto_renew", false);
        return free;
    }

    @PostMapping("/checkout")
    public Map<String, Object> createCheckout(HttpServletRequest request, @RequestBody Map<String, Object> body) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        String planId = body.get("planId") != null ? String.valueOf(body.get("planId")) : null;
        String paymentMethod = body.get("paymentMethod") != null ? String.valueOf(body.get("paymentMethod")) : "UPI";

        return paymentService.createCheckoutSession(userId, planId, paymentMethod);
    }

    @GetMapping("/payment-status/{paymentId}")
    public Map<String, Object> getPaymentStatus(HttpServletRequest request, @PathVariable("paymentId") String paymentId) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        return paymentService.getPaymentStatus(userId, paymentId);
    }

    @PostMapping("/payment/{paymentId}/cancel")
    public Map<String, Object> cancelPayment(HttpServletRequest request, @PathVariable("paymentId") String paymentId) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        return paymentService.cancelPayment(userId, paymentId);
    }

    @PostMapping("/payment/{paymentId}/confirm-simulated")
    public Map<String, Object> confirmSimulated(HttpServletRequest request, @PathVariable("paymentId") String paymentId) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        return paymentService.confirmSimulatedPayment(userId, paymentId);
    }

    @PostMapping("/webhook")
    public Map<String, Object> handleWebhook(
            HttpServletRequest request,
            @RequestHeader(name = "X-Gateway-Signature", required = false) String signature,
            @RequestHeader(name = "X-Gateway-Signature-V2", required = false) String signatureV2,
            @RequestHeader(name = "X-Gateway-Timestamp", required = false) String timestamp,
            @RequestHeader(name = "X-Gateway-Delivery-Id", required = false) String deliveryId,
            @RequestHeader(name = "X-Gateway-Event", required = false) String eventHeader,
            @RequestHeader(name = "X-Razorpay-Signature", required = false) String rzpSignature) {

        try {
            byte[] rawBytes = request.getInputStream().readAllBytes();
            String effectiveSignature = (signature != null && !signature.isBlank()) ? signature : rzpSignature;

            return paymentService.processWebhook(
                    rawBytes,
                    effectiveSignature,
                    signatureV2,
                    timestamp,
                    deliveryId,
                    eventHeader
            );
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Webhook processing failed: " + e.getMessage());
        }
    }

    private void syncAccessSubscription(Long userId, String planId, int durationDays) {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set("X-Internal-Service", "subscription-service");
        org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(
                Map.of("userId", userId, "plan", planId, "durationDays", durationDays), headers);
        restTemplate.postForObject("http://access-service/api/access/subscribe", request, Map.class);
    }

    private String currentPlan(Long userId) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT plan_id FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE' ORDER BY end_date DESC LIMIT 1", userId);
        return rows.isEmpty() ? "Free / Demo" : String.valueOf(rows.get(0).get("plan_id")).replace("_", " ");
    }

    private boolean sendPlanUpgradeEmail(
            Long userId,
            String previousPlan,
            String newPlan,
            Object activationDate,
            Object validUntil,
            String orderId,
            String utr,
            String paymentTime,
            String status) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Service", "subscription-service");
            Map<String, Object> requestBody = Map.of(
                    "userId", userId,
                    "previousPlan", previousPlan,
                    "newPlan", newPlan.replace("_", " "),
                    "activationDate", String.valueOf(activationDate),
                    "validUntil", String.valueOf(validUntil),
                    "orderId", orderId != null ? orderId : "N/A",
                    "utr", utr != null ? utr : "N/A",
                    "paymentTime", paymentTime != null ? paymentTime : "",
                    "status", status != null ? status : "SUCCESS");
            org.springframework.http.HttpEntity<Map<String, Object>> request = new org.springframework.http.HttpEntity<>(requestBody, headers);
            Map<?, ?> response = restTemplate.postForObject("http://auth-service/api/users/internal/plan-upgrade-email", request, Map.class);
            return response != null && Boolean.TRUE.equals(response.get("notificationEmailSent"));
        } catch (Exception error) {
            return false;
        }
    }

    @GetMapping("/payments")
    public List<Map<String, Object>> getPaymentHistory(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        return jdbc.queryForList("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC", userId);
    }

    @PostMapping("/cancel")
    public Map<String, Object> cancelSubscription(HttpServletRequest request) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        int updated = jdbc.update(
                "UPDATE subscriptions SET auto_renew = FALSE, status = 'CANCELLED' WHERE user_id = ? AND status = 'ACTIVE'", 
                userId
        );

        if (updated == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No active subscription found to cancel.");
        }

        return Map.of("message", "Subscription auto-renew cancelled successfully.");
    }

    @PostMapping("/payment/{paymentId}/submit-utr")
    public Map<String, Object> submitUtr(
            HttpServletRequest request,
            @PathVariable("paymentId") String paymentId,
            @RequestBody Map<String, Object> body) {
        Long userId = getUserIdHeader(request);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        String utr = body.get("utr") != null ? String.valueOf(body.get("utr")) : null;
        return paymentService.submitUtrForReview(userId, paymentId, utr);
    }

    @GetMapping("/admin/payments")
    public List<Map<String, Object>> getAdminPayments(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");
        if (role == null || !role.equalsIgnoreCase("admin")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin privileges required.");
        }
        return paymentService.getAllPaymentsForAdmin();
    }

    @PostMapping("/admin/payments/{paymentId}/verify")
    public Map<String, Object> verifyAdminPayment(
            HttpServletRequest request,
            @PathVariable("paymentId") String paymentId,
            @RequestBody Map<String, Object> body) {
        String role = request.getHeader("X-User-Role");
        if (role == null || !role.equalsIgnoreCase("admin")) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin privileges required.");
        }
        String action = body.get("action") != null ? String.valueOf(body.get("action")) : "CONFIRM";
        String adminUtr = body.get("utr") != null ? String.valueOf(body.get("utr")) : null;
        String note = body.get("note") != null ? String.valueOf(body.get("note")) : null;

        return paymentService.verifyAdminPayment(paymentId, action, adminUtr, note);
    }

    private Long getUserIdHeader(HttpServletRequest request) {
        String header = request.getHeader("X-User-Id");
        if (header == null || header.isBlank()) return null;
        try {
            return Long.parseLong(header);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

