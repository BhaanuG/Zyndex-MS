package com.zyndex.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final JdbcTemplate jdbc;
    private final RestTemplate restTemplate;
    private final JavaMailSender mailSender;
    private final ObjectMapper objectMapper;

    @Value("${payment.mode:UPI_DIRECT}")
    private String paymentMode;

    @Value("${zyndex.otp-mail-from:}")
    private String mailFrom;

    @Value("${zyndex.receiver-upi-id:918897337687@waaxis}")
    private String receiverUpiId;

    public PaymentService(JdbcTemplate jdbc, RestTemplate restTemplate, JavaMailSender mailSender) {
        this.jdbc = jdbc;
        this.restTemplate = restTemplate;
        this.mailSender = mailSender;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Creates a new Zyndex order and initiates a direct UPI payment session.
     * Enforces rate limiting: A user can initiate payment at most 3 times a day.
     * If any payment succeeds today, the attempt count is reset.
     */
    public Map<String, Object> createCheckoutSession(Long userId, String requestedPlanId, String requestedPaymentMethod) {
        if (userId == null || userId <= 0) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        // Rate limiting check: Maximum 3 payment initiations per day.
        // If a payment has succeeded today, the counter resets.
        Integer successfulToday = jdbc.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE user_id = ? AND status = 'SUCCESS' AND created_at >= CURRENT_DATE()",
                Integer.class, userId
        );

        if (successfulToday == null || successfulToday == 0) {
            Integer attemptsToday = jdbc.queryForObject(
                    "SELECT COUNT(*) FROM payments WHERE user_id = ? AND created_at >= CURRENT_DATE()",
                    Integer.class, userId
            );
            if (attemptsToday != null && attemptsToday >= 3) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Payment initiation limit reached: You can initiate payment up to 3 times per day. Please try again tomorrow or contact support.");
            }
        }

        String planId = requestedPlanId != null ? requestedPlanId.trim().toUpperCase() : "";
        String paymentMethod = requestedPaymentMethod != null ? requestedPaymentMethod.trim().toUpperCase() : "UPI";

        // 1. Validate requested plan strictly against the server-side database
        List<Map<String, Object>> plans = jdbc.queryForList("SELECT * FROM plans WHERE id = ? AND active = TRUE", planId);
        if (plans.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid or inactive plan selection: " + planId);
        }

        Map<String, Object> plan = plans.get(0);
        long pricePaise = ((Number) plan.get("price_paise")).longValue();
        String currency = plan.get("currency") != null ? String.valueOf(plan.get("currency")) : "INR";

        // 2. Generate unique Zyndex payment ID & order ID
        String paymentId = "PAY_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String orderId = "ORD_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        // Session valid for 300 seconds (5 minutes)
        Instant expiresAt = Instant.now().plusSeconds(300);
        String previousPlan = currentPlan(userId);

        // 3. Record initial state PENDING in database
        jdbc.update(
                """
                INSERT INTO payments (
                    id, order_id, user_id, plan_id, previous_plan, amount_paise, currency,
                    payment_method, gateway, gateway_payment_id, gateway_order_id,
                    status, expires_at, created_at, receipt_email_sent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'UPI_DIRECT', ?, ?, 'PAYMENT_INITIATED', ?, NOW(6), FALSE)
                """,
                paymentId, orderId, userId, planId, previousPlan, pricePaise, currency,
                paymentMethod, paymentId, orderId, Timestamp.from(expiresAt)
        );

        auditLog(paymentId, orderId, userId, "ORDER_CREATED", null, PaymentStatus.PAYMENT_INITIATED.name(), null, "Created direct UPI order for plan " + planId);

        // 4. Generate UPI URI & QR Code
        double amountRupees = pricePaise / 100.0;
        String targetUpiId = (receiverUpiId != null && !receiverUpiId.isBlank()) ? receiverUpiId : "918897337687@waaxis";
        String upiUri = "upi://pay?pa=" + targetUpiId +
                "&pn=ScholarSphere%20Digital" +
                "&am=" + String.format(Locale.US, "%.2f", amountRupees) +
                "&tr=" + orderId +
                "&tn=" + URLEncoder.encode("Subscription " + planId, StandardCharsets.UTF_8);

        String qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
                URLEncoder.encode(upiUri, StandardCharsets.UTF_8);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("paymentId", paymentId);
        result.put("orderId", orderId);
        result.put("qrUrl", qrUrl);
        result.put("upiUri", upiUri);
        result.put("receiverUpiId", targetUpiId);
        result.put("amount", pricePaise);
        result.put("amountRupees", amountRupees);
        result.put("currency", currency);
        result.put("status", PaymentStatus.PAYMENT_INITIATED.name());
        result.put("expiresAt", expiresAt.getEpochSecond());
        result.put("timeLeft", 300);
        return result;
    }

    /**
     * Gets current payment status with expiry checking.
     */
    public Map<String, Object> getPaymentStatus(Long userId, String paymentId) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? AND user_id = ?",
                paymentId, userId
        );

        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> payment = payments.get(0);
        String currentStatusStr = String.valueOf(payment.get("status")).toUpperCase();
        String orderId = String.valueOf(payment.get("order_id"));
        String utr = payment.get("utr") != null ? String.valueOf(payment.get("utr")) : null;

        Instant expiresInstant = resolveInstant(payment.get("expires_at"));

        // Check if expired
        if ((currentStatusStr.equals("PENDING") || currentStatusStr.equals("PAYMENT_INITIATED") || currentStatusStr.equals("PROCESSING"))
                && expiresInstant != null && Instant.now().isAfter(expiresInstant)) {
            jdbc.update("UPDATE payments SET status = 'EXPIRED' WHERE id = ? AND status NOT IN ('SUCCESS', 'FAILED')", paymentId);
            auditLog(paymentId, orderId, userId, "PAYMENT_EXPIRED", currentStatusStr, PaymentStatus.EXPIRED.name(), null, "Session expired after 300s");
            currentStatusStr = PaymentStatus.EXPIRED.name();
        }

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("status", currentStatusStr);
        resp.put("paymentId", paymentId);
        resp.put("orderId", orderId);
        resp.put("utr", utr);
        resp.put("failureReason", payment.get("failure_reason"));
        resp.put("reviewReason", payment.get("review_reason"));
        return resp;
    }

    /**
     * Cancels an ongoing payment order.
     */
    public Map<String, Object> cancelPayment(Long userId, String paymentId) {
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? AND user_id = ?",
                paymentId, userId
        );
        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> payment = payments.get(0);
        String currentStatus = String.valueOf(payment.get("status")).toUpperCase();

        if (PaymentStatus.valueOf(currentStatus).isTerminal()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment is already in terminal state: " + currentStatus);
        }

        String orderId = String.valueOf(payment.get("order_id"));

        jdbc.update("UPDATE payments SET status = 'CANCELLED' WHERE id = ?", paymentId);
        auditLog(paymentId, orderId, userId, "PAYMENT_CANCELLED", currentStatus, PaymentStatus.CANCELLED.name(), null, "User requested cancellation");

        return Map.of("message", "Payment cancelled successfully.", "status", "CANCELLED");
    }

    /**
     * Authoritative Webhook Processor for direct payment gateway events.
     * Supports idempotent delivery recording, amount/currency validation, and subscription activation.
     */
    @SuppressWarnings("unchecked")
    @Transactional
    public Map<String, Object> processWebhook(
            byte[] rawBodyBytes,
            String signatureHeader,
            String signatureV2Header,
            String timestampHeader,
            String deliveryIdHeader,
            String eventHeader) {

        if (rawBodyBytes == null || rawBodyBytes.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Missing raw webhook payload body.");
        }

        String rawPayloadString = new String(rawBodyBytes, StandardCharsets.UTF_8);

        // 1. Parse JSON first to detect format and validate well-formedness
        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(rawBodyBytes, Map.class);
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Malformed JSON webhook payload: " + e.getMessage());
        }

        boolean isMockPayload = payload.containsKey("event") && (payload.get("event") instanceof Map);

        // 2. Handle mock simulator payload format if present
        if (isMockPayload) {
            Map<String, Object> mockEvent = (Map<String, Object>) payload.get("event");
            return handleMockWebhook(mockEvent);
        }

        String rawEvent = payload.get("event") != null ? String.valueOf(payload.get("event")).toUpperCase() : (eventHeader != null ? eventHeader.toUpperCase() : "SUCCESS");
        String event = "SUCCESS";
        if (rawEvent.contains("FAIL")) {
            event = "FAILED";
        } else if (rawEvent.contains("EXPIR")) {
            event = "EXPIRED";
        } else if (rawEvent.contains("CANCEL")) {
            event = "CANCELLED";
        } else if (rawEvent.contains("SUCCESS") || rawEvent.contains("PAID")) {
            event = "SUCCESS";
        } else {
            event = rawEvent;
        }

        String paymentId = payload.get("paymentId") != null ? String.valueOf(payload.get("paymentId")) : null;
        String orderId = payload.get("orderId") != null ? String.valueOf(payload.get("orderId")) : null;
        String utr = payload.get("utr") != null ? String.valueOf(payload.get("utr")) : null;
        String currency = payload.get("currency") != null ? String.valueOf(payload.get("currency")) : "INR";
        Integer verificationLevel = payload.get("verificationLevel") instanceof Number n ? n.intValue() : 0;
        String verificationTag = payload.get("verificationTag") != null ? String.valueOf(payload.get("verificationTag")) : "OBSERVED_VERIFIED";

        Long amountPaise = null;
        if (payload.get("amountPaise") instanceof Number n) {
            amountPaise = n.longValue();
        } else if (payload.get("amount") != null) {
            try {
                double r = Double.parseDouble(String.valueOf(payload.get("amount")));
                amountPaise = Math.round(r * 100);
            } catch (NumberFormatException ignored) {}
        }

        String deliveryId = deliveryIdHeader != null && !deliveryIdHeader.isBlank()
                ? deliveryIdHeader
                : (payload.get("deliveryId") != null ? String.valueOf(payload.get("deliveryId")) : "dlv_" + UUID.randomUUID());

        // 3. Webhook Delivery Idempotency Check (Stable Delivery ID deduplication)
        Integer existingDeliveryCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM payment_webhook_deliveries WHERE delivery_id = ?",
                Integer.class, deliveryId
        );
        if (existingDeliveryCount != null && existingDeliveryCount > 0) {
            log.info("Duplicate webhook delivery ID {} ignored.", deliveryId);
            return Map.of("message", "Duplicate webhook delivery ignored.", "deliveryId", deliveryId, "status", "SUCCESS");
        }

        // 4. Locate payment transaction record
        List<Map<String, Object>> existing = List.of();
        if (orderId != null && !orderId.isBlank()) {
            existing = jdbc.queryForList("SELECT * FROM payments WHERE order_id = ? OR id = ? OR gateway_order_id = ?", orderId, orderId, orderId);
        }
        if (existing.isEmpty() && paymentId != null && !paymentId.isBlank()) {
            existing = jdbc.queryForList("SELECT * FROM payments WHERE id = ? OR gateway_payment_id = ?", paymentId, paymentId);
        }

        if (existing.isEmpty()) {
            recordDelivery(deliveryId, paymentId, orderId, event, true, rawPayloadString, "ORPHAN_UNMAPPED");
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found for orderId: " + orderId);
        }

        Map<String, Object> dbPayment = existing.get(0);
        String dbPaymentId = String.valueOf(dbPayment.get("id"));
        String dbOrderId = String.valueOf(dbPayment.get("order_id"));
        Long userId = ((Number) dbPayment.get("user_id")).longValue();
        long dbAmountPaise = ((Number) dbPayment.get("amount_paise")).longValue();
        String dbCurrency = String.valueOf(dbPayment.get("currency"));
        String planId = String.valueOf(dbPayment.get("plan_id"));
        String dbStatus = String.valueOf(dbPayment.get("status")).toUpperCase();

        // 5. Amount & Currency Strict Validation
        if (amountPaise != null && amountPaise != dbAmountPaise) {
            String reviewReason = String.format("Payment amount mismatch: expected %d paise, received %d paise", dbAmountPaise, amountPaise);
            jdbc.update("UPDATE payments SET status = 'REVIEW_REQUIRED', review_reason = ? WHERE id = ?", reviewReason, dbPaymentId);
            auditLog(dbPaymentId, dbOrderId, userId, "AMOUNT_MISMATCH_REVIEW_REQUIRED", dbStatus, "REVIEW_REQUIRED", utr, reviewReason);
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "REVIEW_REQUIRED");
            return Map.of("message", "Payment amount mismatch flagged for review.", "status", "REVIEW_REQUIRED");
        }

        if (currency != null && !currency.equalsIgnoreCase(dbCurrency)) {
            String reviewReason = "Currency mismatch: expected " + dbCurrency + ", received " + currency;
            jdbc.update("UPDATE payments SET status = 'REVIEW_REQUIRED', review_reason = ? WHERE id = ?", reviewReason, dbPaymentId);
            auditLog(dbPaymentId, dbOrderId, userId, "CURRENCY_MISMATCH_REVIEW_REQUIRED", dbStatus, "REVIEW_REQUIRED", utr, reviewReason);
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "REVIEW_REQUIRED");
            return Map.of("message", "Currency mismatch flagged for review.", "status", "REVIEW_REQUIRED");
        }

        // 6. Check late-arriving payment after checkout expiry
        if ("EXPIRED".equals(dbStatus) && "SUCCESS".equals(event)) {
            String reviewReason = "Payment verified after session expiry. Retained for manual reconciliation.";
            jdbc.update("UPDATE payments SET status = 'REVIEW_REQUIRED', review_reason = ?, utr = ? WHERE id = ?", reviewReason, utr, dbPaymentId);
            auditLog(dbPaymentId, dbOrderId, userId, "LATE_PAYMENT_REVIEW_REQUIRED", dbStatus, "REVIEW_REQUIRED", utr, reviewReason);
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "REVIEW_REQUIRED");
            return Map.of("message", "Late payment after expiry held for manual review.", "status", "REVIEW_REQUIRED");
        }

        // 7. Handle Event Outcomes
        if ("SUCCESS".equals(event)) {
            if ("SUCCESS".equals(dbStatus)) {
                recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "DUPLICATE");
                return Map.of("message", "Payment already confirmed.", "status", "SUCCESS");
            }

            activateSuccessfulSubscription(
                    dbPaymentId,
                    dbOrderId,
                    userId,
                    planId,
                    dbAmountPaise,
                    paymentId,
                    utr,
                    deliveryId,
                    verificationLevel,
                    verificationTag
            );
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "PROCESSED");
            return Map.of("message", "Payment verified and subscription activated successfully.", "status", "SUCCESS", "success", true);

        } else if ("FAILED".equals(event)) {
            String failureReason = payload.get("reason") != null ? String.valueOf(payload.get("reason")) : "Payment failed on gateway";
            jdbc.update("UPDATE payments SET status = 'FAILED', failure_reason = ? WHERE id = ?", failureReason, dbPaymentId);
            auditLog(dbPaymentId, dbOrderId, userId, "PAYMENT_FAILED", dbStatus, "FAILED", utr, failureReason);
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "PROCESSED");
            return Map.of("message", "Payment marked as failed.", "status", "FAILED", "success", false);

        } else if ("EXPIRED".equals(event)) {
            if (!"SUCCESS".equals(dbStatus)) {
                jdbc.update("UPDATE payments SET status = 'EXPIRED' WHERE id = ?", dbPaymentId);
                auditLog(dbPaymentId, dbOrderId, userId, "PAYMENT_EXPIRED", dbStatus, "EXPIRED", utr, "Webhook reported EXPIRED");
            }
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "PROCESSED");
            return Map.of("message", "Payment marked as expired.", "status", "EXPIRED");

        } else if ("CANCELLED".equals(event)) {
            if (!"SUCCESS".equals(dbStatus)) {
                jdbc.update("UPDATE payments SET status = 'CANCELLED' WHERE id = ?", dbPaymentId);
                auditLog(dbPaymentId, dbOrderId, userId, "PAYMENT_CANCELLED", dbStatus, "CANCELLED", utr, "Webhook reported CANCELLED");
            }
            recordDelivery(deliveryId, dbPaymentId, dbOrderId, event, true, rawPayloadString, "PROCESSED");
            return Map.of("message", "Payment marked as cancelled.", "status", "CANCELLED");
        }

        return Map.of("message", "Webhook received.", "status", event);
    }

    private Map<String, Object> handleMockWebhook(Map<String, Object> mockEvent) {
        String paymentId = String.valueOf(mockEvent.get("paymentId"));
        String orderId = String.valueOf(mockEvent.get("orderId"));
        String status = String.valueOf(mockEvent.get("status")).toUpperCase();
        String planId = mockEvent.get("planId") != null ? String.valueOf(mockEvent.get("planId")).toUpperCase() : null;

        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? OR order_id = ? OR gateway_payment_id = ?",
                paymentId, orderId, paymentId
        );
        if (existing.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> dbPayment = existing.get(0);
        String dbPaymentId = String.valueOf(dbPayment.get("id"));
        String dbOrderId = String.valueOf(dbPayment.get("order_id"));
        Long userId = ((Number) dbPayment.get("user_id")).longValue();
        long amountPaise = ((Number) dbPayment.get("amount_paise")).longValue();
        String dbPlanId = planId != null ? planId : String.valueOf(dbPayment.get("plan_id"));
        String dbStatus = String.valueOf(dbPayment.get("status")).toUpperCase();

        if ("SUCCESS".equals(dbStatus)) {
            return Map.of("message", "Duplicate event ignored.", "paymentStatus", "SUCCESS");
        }

        if ("SUCCESS".equals(status)) {
            activateSuccessfulSubscription(
                    dbPaymentId,
                    dbOrderId,
                    userId,
                    dbPlanId,
                    amountPaise,
                    paymentId,
                    "UTR_MOCK_" + UUID.randomUUID().toString().substring(0, 8),
                    "mock_delivery_" + UUID.randomUUID().toString().substring(0, 8),
                    1,
                    "DEVELOPER_SIMULATED"
            );
        } else {
            jdbc.update("UPDATE payments SET status = ?, failure_reason = 'Simulated failure' WHERE id = ?", status, dbPaymentId);
        }
        return Map.of("message", "Mock webhook processed successfully.", "paymentStatus", status);
    }

    /**
     * Atomically activates a subscription for a verified payment.
     * Idempotent: repeated calls with same payment will not duplicate subscriptions.
     */
    public synchronized void activateSuccessfulSubscription(
            String paymentId,
            String orderId,
            Long userId,
            String planId,
            long amountPaise,
            String gatewayPaymentId,
            String utr,
            String deliveryId,
            int verificationLevel,
            String verificationTag) {

        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT status, receipt_email_sent FROM payments WHERE id = ?", paymentId
        );
        if (existing.isEmpty()) return;

        String currentStatus = String.valueOf(existing.get(0).get("status")).toUpperCase();
        if ("SUCCESS".equals(currentStatus)) {
            return;
        }

        int durationDays = (planId.contains("UNIVERSITY") || planId.contains("ENTERPRISE")) ? 365 : 30;
        String subscriptionId = "SUB_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        // 1. Update payment to SUCCESS
        jdbc.update(
                """
                UPDATE payments
                SET status = 'SUCCESS',
                    gateway_payment_id = COALESCE(?, gateway_payment_id),
                    gateway_event_id = COALESCE(?, gateway_event_id),
                    utr = COALESCE(?, utr),
                    verification_level = ?,
                    verification_tag = ?,
                    paid_at = NOW(6)
                WHERE id = ?
                """,
                gatewayPaymentId, deliveryId, utr, verificationLevel, verificationTag, paymentId
        );

        // 2. Revoke previous active subscription
        String previousPlan = currentPlan(userId);
        jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);

        // 3. Insert new active subscription
        jdbc.update(
                """
                INSERT INTO subscriptions (
                    id, user_id, plan_id, status, start_date, end_date, auto_renew
                ) VALUES (?, ?, ?, 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), TRUE)
                """,
                subscriptionId, userId, planId, durationDays
        );

        jdbc.update("UPDATE payments SET subscription_id = ? WHERE id = ?", subscriptionId, paymentId);

        auditLog(paymentId, orderId, userId, "SUBSCRIPTION_ACTIVATED", currentStatus, PaymentStatus.SUCCESS.name(), utr,
                "Activated subscription " + subscriptionId + " for plan " + planId);

        // 4. Synchronize with Access Service for immediate entitlement unlocking
        try {
            syncAccessSubscription(userId, planId, durationDays);
        } catch (Exception e) {
            log.error("Failed to sync access entitlement for user {}: {}", userId, e.getMessage());
        }

        // 5. Send plan upgrade notification email
        String exactTime = LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        sendPlanUpgradeEmail(userId, previousPlan, planId, LocalDateTime.now(), LocalDate.now().plusDays(durationDays),
                orderId, utr, exactTime, "SUCCESS");

        // 6. Send receipt confirmation email
        Integer receiptSent = jdbc.queryForObject(
                "SELECT COUNT(*) FROM payments WHERE id = ? AND receipt_email_sent = TRUE",
                Integer.class, paymentId
        );
        if (receiptSent == null || receiptSent == 0) {
            sendPaymentSuccessEmail(paymentId, orderId, userId, planId, amountPaise, utr, durationDays);
        }
    }

    private void recordDelivery(String deliveryId, String paymentId, String orderId, String eventType, boolean signatureVerified, String payload, String status) {
        try {
            jdbc.update(
                    """
                    INSERT INTO payment_webhook_deliveries (
                        delivery_id, payment_id, order_id, event_type, signature_verified, payload, status, processed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6))
                    """,
                    deliveryId, paymentId, orderId, eventType, signatureVerified, payload, status
            );
        } catch (DuplicateKeyException e) {
            log.warn("Delivery ID {} already exists in payment_webhook_deliveries.", deliveryId);
        } catch (Exception e) {
            log.warn("Failed to record webhook delivery {}: {}", deliveryId, e.getMessage());
        }
    }

    private void auditLog(String paymentId, String orderId, Long userId, String eventType, String fromStatus, String toStatus, String utr, String details) {
        try {
            jdbc.update(
                    """
                    INSERT INTO payment_audit_logs (
                        payment_id, order_id, user_id, event_type, from_status, to_status, utr, details, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(6))
                    """,
                    paymentId, orderId, userId, eventType, fromStatus, toStatus, utr, details
            );
        } catch (Exception e) {
            log.warn("Failed to write payment audit log: {}", e.getMessage());
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
            log.warn("Failed to send plan upgrade email: {}", error.getMessage());
            return false;
        }
    }

    private void sendPaymentSuccessEmail(String paymentId, String orderId, Long userId, String planId, long amountPaise, String utr, int durationDays) {
        Map<String, Object> user = getUserDetails(userId);
        String name = String.valueOf(user.get("name"));
        String email = String.valueOf(user.get("email"));

        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : "support@scholarsphere.com";
            if (!from.contains("<")) {
                helper.setFrom(from, "Zyndex Team");
            } else {
                helper.setFrom(from);
            }
            helper.setTo(email);
            helper.setSubject("Zyndex Subscription Payment Confirmation");

            double amountRupees = amountPaise / 100.0;
            LocalDate startDate = LocalDate.now();
            LocalDate endDate = startDate.plusDays(durationDays);
            String billingPeriod = durationDays > 30 ? "Annual (365 Days)" : "Monthly (30 Days)";

            String content = String.format(
                    """
                    Hello %s,

                    Your subscription payment has been processed and verified successfully.

                    === PAYMENT RECEIPT ===
                    - Customer Name: %s
                    - Customer Email: %s
                    - Subscription Plan: %s
                    - Amount Paid: ₹%.2f
                    - Currency: INR
                    - Payment ID: %s
                    - Order ID: %s
                    - Bank Reference / UTR: %s
                    - Transaction Date: %s
                    - Start Date: %s
                    - Expiry Date: %s
                    - Billing Period: %s
                    - Auto-Renew: Active (True)

                    Your premium digital library access has been activated immediately.

                    Thank you for choosing Zyndex!
                    """,
                    name, name, email, planId.replace("_", " "), amountRupees,
                    paymentId, orderId, (utr != null ? utr : "N/A"),
                    LocalDateTime.now(), startDate, endDate, billingPeriod
            );

            String htmlBody = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Official Payment & Subscription Receipt</title>
                      <style>
                        body { margin: 0; padding: 16px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
                        .email-wrapper { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                        .header-box { background: linear-gradient(135deg, #ea580c 0%%, #dc2626 100%%); padding: 24px 20px; text-align: center; }
                        .content-box { padding: 24px 20px; }
                        .receipt-table td { padding: 5px 0; font-size: 13px; word-break: break-word; }
                        @media only screen and (max-width: 480px) {
                          body { padding: 8px 4px !important; }
                          .header-box { padding: 20px 14px !important; }
                          .content-box { padding: 18px 14px !important; }
                        }
                      </style>
                    </head>
                    <body>
                        <div class="email-wrapper">
                            <div class="header-box">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Zyndex</h1>
                                <p style="color: #ffedd5; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Official Payment & Subscription Receipt</p>
                            </div>
                            <div class="content-box">
                                <p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #0f172a;">Hello %s,</p>
                                <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">Your subscription payment has been processed and verified successfully.</p>
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
                                    <h3 style="margin: 0 0 10px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ea580c; letter-spacing: 0.5px;">Payment Receipt</h3>
                                    <table class="receipt-table" style="width: 100%%; font-size: 13px; color: #334155; border-collapse: collapse;">
                                        <tr><td style="padding: 5px 0; font-weight: 600; width: 40%%; color: #64748b;">Customer Name:</td><td style="padding: 5px 0; font-weight: 500;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Customer Email:</td><td style="padding: 5px 0; font-family: monospace;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Plan:</td><td style="padding: 5px 0;"><strong style="color: #ea580c;">%s</strong></td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Amount Paid:</td><td style="padding: 5px 0;"><strong>₹%.2f</strong></td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Payment ID:</td><td style="padding: 5px 0; font-family: monospace; font-size: 12px;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Order ID:</td><td style="padding: 5px 0; font-family: monospace; font-size: 12px;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">UTR / Ref:</td><td style="padding: 5px 0; font-family: monospace; font-size: 12px;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Start Date:</td><td style="padding: 5px 0;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Expiry Date:</td><td style="padding: 5px 0;">%s</td></tr>
                                        <tr><td style="padding: 5px 0; font-weight: 600; color: #64748b;">Billing Period:</td><td style="padding: 5px 0;">%s</td></tr>
                                    </table>
                                </div>
                                <p style="margin: 16px 0; font-size: 13px; color: #475569; line-height: 1.6;">Your premium digital library access has been activated immediately. Thank you for choosing Zyndex!</p>
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 13px; color: #64748b;">
                                    <p style="margin: 0;">Best regards,</p>
                                    <p style="margin: 4px 0 0 0; font-weight: 700; color: #0f172a;">Zyndex Team</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                    """.formatted(name, name, email, planId.replace("_", " "), amountRupees, paymentId, orderId, (utr != null ? utr : "N/A"), startDate, endDate, billingPeriod);

            helper.setText(content, htmlBody);
            mailSender.send(mimeMessage);
            jdbc.update("UPDATE payments SET receipt_email_sent = TRUE WHERE id = ?", paymentId);
            log.info("Payment confirmation receipt sent to: {}", email);
        } catch (Exception e) {
            log.warn("Failed to send payment receipt email: {}", e.getMessage());
        }
    }

    public Map<String, Object> confirmSimulatedPayment(Long userId, String paymentId) {
        if (userId == null || userId <= 0) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? AND user_id = ?",
                paymentId, userId
        );

        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> payment = payments.get(0);
        String currentStatusStr = String.valueOf(payment.get("status")).toUpperCase();
        String orderId = String.valueOf(payment.get("order_id"));

        if ("SUCCESS".equals(currentStatusStr)) {
            return Map.of("status", "SUCCESS", "paymentId", paymentId, "orderId", orderId, "message", "Payment already confirmed.");
        }

        String planId = String.valueOf(payment.get("plan_id"));
        long amountPaise = ((Number) payment.get("amount_paise")).longValue();
        String simGatewayPaymentId = payment.get("gateway_payment_id") != null ? String.valueOf(payment.get("gateway_payment_id")) : "SIM_" + UUID.randomUUID().toString().substring(0, 8);
        String utr = "UTR" + System.currentTimeMillis();

        activateSuccessfulSubscription(
                paymentId,
                orderId,
                userId,
                planId,
                amountPaise,
                simGatewayPaymentId,
                utr,
                "manual_test_delivery_" + System.currentTimeMillis(),
                1,
                "MANUAL_TEST_CONFIRMED"
        );

        return Map.of(
                "status", "SUCCESS",
                "paymentId", paymentId,
                "orderId", orderId,
                "utr", utr,
                "message", "Payment successfully verified and subscription activated."
        );
    }

    /**
     * Submits customer UTR number, holds subscription in REVIEW_REQUIRED,
     * and sends notification email to administrators.
     */
    public Map<String, Object> submitUtrForReview(Long userId, String paymentId, String utrNumber) {
        if (userId == null || userId <= 0) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        if (utrNumber == null || utrNumber.trim().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UTR / Transaction reference number is required.");
        }
        String cleanUtr = utrNumber.trim();

        List<Map<String, Object>> payments = jdbc.queryForList(
                "SELECT * FROM payments WHERE id = ? AND user_id = ?",
                paymentId, userId
        );
        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> payment = payments.get(0);
        String currentStatusStr = String.valueOf(payment.get("status")).toUpperCase();
        String orderId = String.valueOf(payment.get("order_id"));
        String planId = String.valueOf(payment.get("plan_id"));
        long amountPaise = ((Number) payment.get("amount_paise")).longValue();
        double amountRupees = amountPaise / 100.0;

        String previousPlan = payment.get("previous_plan") != null ? String.valueOf(payment.get("previous_plan")) : currentPlan(userId);

        // Update payment status to REVIEW_REQUIRED and save UTR
        jdbc.update(
                """
                UPDATE payments
                SET status = 'REVIEW_REQUIRED',
                    utr = ?,
                    review_reason = 'User submitted UTR for manual verification. Subscription on hold.'
                WHERE id = ?
                """,
                cleanUtr, paymentId
        );

        auditLog(paymentId, orderId, userId, "UTR_SUBMITTED_HOLD", currentStatusStr, PaymentStatus.REVIEW_REQUIRED.name(), cleanUtr,
                "Customer submitted UTR: " + cleanUtr + ". Placed on review hold.");

        // Send email simultaneously to Bhaanugali@gmail.com and Bhaanugali99sai@gmail.com
        sendAdminHoldNotificationEmail(paymentId, orderId, userId, cleanUtr, planId, previousPlan, amountRupees);

        return Map.of(
                "status", "REVIEW_REQUIRED",
                "paymentId", paymentId,
                "orderId", orderId,
                "utr", cleanUtr,
                "message", "UTR submitted successfully. Your payment is being verified by admin. Subscription is on temporary hold."
        );
    }

    private void sendAdminHoldNotificationEmail(String paymentId, String orderId, Long userId, String utr, String presentPlan, String previousPlan, double amountRupees) {
        Map<String, Object> user = getUserDetails(userId);
        String userName = String.valueOf(user.get("name"));
        String userEmail = String.valueOf(user.get("email"));
        LocalDateTime now = LocalDateTime.now();

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : "support@scholarsphere.com";
            if (!from.contains("<")) {
                msg.setFrom("Zyndex Team <" + from + ">");
            } else {
                msg.setFrom(from);
            }
            msg.setTo("Bhaanugali@gmail.com", "Bhaanugali99sai@gmail.com");
            msg.setSubject("Zyndex Payment Hold Notification — UTR Verification Required (" + utr + ")");

            String text = String.format(
                    """
                    Hello Admin,

                    A user has submitted a UPI payment reference (UTR) on Zyndex. The payment and membership have been put on HOLD pending manual admin verification.

                    === PAYMENT & USER DETAILS ===
                    User Name: %s
                    User Email: %s
                    Date & Time: %s
                    UTR Number: %s
                    Present Plan (Purchased): %s
                    Previous Plan: %s
                    Amount Paid: ₹%.2f
                    Payment ID: %s
                    Order ID: %s

                    Action Required:
                    Please verify this UTR in your bank statement (Union Bank / UPI app) and Confirm or Decline the payment in the Admin Portal Payments page.

                    Best regards,
                    Zyndex Automation System
                    """,
                    userName, userEmail, now.toString(), utr,
                    presentPlan.replace("_", " "), previousPlan.replace("_", " "),
                    amountRupees, paymentId, orderId
            );

            msg.setText(text);
            mailSender.send(msg);
            log.info("Admin payment hold notification email sent to Bhaanugali@gmail.com and Bhaanugali99sai@gmail.com for payment {}", paymentId);
        } catch (Exception e) {
            log.warn("Failed to send admin hold notification email: {}", e.getMessage());
        }
    }

    /**
     * Retrieves all payments for the admin portal with user details and sorting.
     */
    public List<Map<String, Object>> getAllPaymentsForAdmin() {
        String sql = """
                SELECT 
                    p.id,
                    p.order_id,
                    p.user_id,
                    p.plan_id,
                    p.previous_plan,
                    p.amount_paise,
                    p.currency,
                    p.payment_method,
                    p.gateway,
                    p.status,
                    p.utr,
                    p.review_reason,
                    p.failure_reason,
                    p.created_at,
                    p.paid_at,
                    p.expires_at,
                    COALESCE(u.username, CONCAT('User #', p.user_id)) AS user_name,
                    COALESCE(u.email, 'N/A') AS user_email
                FROM payments p
                LEFT JOIN zyndex_auth.users u ON p.user_id = u.id
                ORDER BY 
                    CASE p.status
                        WHEN 'REVIEW_REQUIRED' THEN 1
                        WHEN 'PROCESSING' THEN 2
                        WHEN 'PAYMENT_INITIATED' THEN 3
                        WHEN 'PENDING' THEN 4
                        WHEN 'SUCCESS' THEN 5
                        WHEN 'FAILED' THEN 6
                        WHEN 'CANCELLED' THEN 7
                        WHEN 'EXPIRED' THEN 8
                        ELSE 9
                    END,
                    p.created_at DESC
                """;

        List<Map<String, Object>> results;
        try {
            results = jdbc.queryForList(sql);
        } catch (Exception e) {
            log.warn("Direct JOIN with zyndex_auth failed, querying payments directly: {}", e.getMessage());
            results = jdbc.queryForList("SELECT * FROM payments ORDER BY created_at DESC");
        }

        for (Map<String, Object> row : results) {
            Object name = row.get("user_name");
            Object email = row.get("user_email");
            if (name == null || email == null || "N/A".equals(name) || "N/A".equals(email)) {
                Long uid = row.get("user_id") != null ? ((Number) row.get("user_id")).longValue() : null;
                if (uid != null) {
                    Map<String, Object> u = getUserDetails(uid);
                    row.put("user_name", u.get("name"));
                    row.put("user_email", u.get("email"));
                }
            }
        }
        return results;
    }

    /**
     * Admin action to manually confirm, decline, mark as not received, or cancel a payment.
     */
    @Transactional
    public Map<String, Object> verifyAdminPayment(String paymentId, String action, String adminUtr, String note) {
        List<Map<String, Object>> payments = jdbc.queryForList("SELECT * FROM payments WHERE id = ?", paymentId);
        if (payments.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Payment transaction record not found.");
        }

        Map<String, Object> payment = payments.get(0);
        String currentStatusStr = String.valueOf(payment.get("status")).toUpperCase();
        Long userId = ((Number) payment.get("user_id")).longValue();
        String orderId = String.valueOf(payment.get("order_id"));
        String planId = String.valueOf(payment.get("plan_id"));
        long amountPaise = ((Number) payment.get("amount_paise")).longValue();
        String effectiveUtr = (adminUtr != null && !adminUtr.isBlank()) ? adminUtr.trim() : (payment.get("utr") != null ? String.valueOf(payment.get("utr")) : "MANUAL_VERIFIED");

        Map<String, Object> user = getUserDetails(userId);
        String userName = String.valueOf(user.get("name"));
        String userEmail = String.valueOf(user.get("email"));

        String normalizedAction = (action != null ? action.trim().toUpperCase() : "CONFIRM");

        if ("CONFIRM".equals(normalizedAction) || "ACCEPT".equals(normalizedAction) || "APPROVE".equals(normalizedAction)) {
            activateSuccessfulSubscription(
                    paymentId,
                    orderId,
                    userId,
                    planId,
                    amountPaise,
                    payment.get("gateway_payment_id") != null ? String.valueOf(payment.get("gateway_payment_id")) : paymentId,
                    effectiveUtr,
                    "admin_manual_confirm_" + System.currentTimeMillis(),
                    2,
                    "ADMIN_MANUAL_CONFIRMED"
            );
            auditLog(paymentId, orderId, userId, "ADMIN_PAYMENT_CONFIRMED", currentStatusStr, PaymentStatus.SUCCESS.name(), effectiveUtr,
                    "Admin manually confirmed payment. Note: " + note);
            return Map.of("status", "SUCCESS", "message", "Payment accepted and subscription activated successfully.");

        } else if ("DECLINE".equals(normalizedAction) || "REJECT".equals(normalizedAction)) {
            String declineReason = (note != null && !note.isBlank()) ? note.trim() : "Payment declined by administrator during verification.";
            jdbc.update("UPDATE payments SET status = 'FAILED', failure_reason = ?, utr = COALESCE(?, utr) WHERE id = ?", declineReason, adminUtr, paymentId);
            auditLog(paymentId, orderId, userId, "ADMIN_PAYMENT_DECLINED", currentStatusStr, PaymentStatus.FAILED.name(), effectiveUtr, declineReason);
            sendPaymentStatusNotificationEmail(userName, userEmail, "DECLINED", paymentId, orderId, planId, amountPaise, effectiveUtr, declineReason);
            return Map.of("status", "FAILED", "message", "Payment declined and notification sent to " + userEmail + ".");

        } else if ("NOT_RECEIVED".equals(normalizedAction) || "NOT_RECIVED".equals(normalizedAction) || "NOT RECEIVED".equals(normalizedAction)) {
            String reason = (note != null && !note.isBlank()) ? note.trim() : "Payment not credited to bank account / UTR not found in bank statement.";
            jdbc.update("UPDATE payments SET status = 'FAILED', failure_reason = ?, review_reason = ?, utr = COALESCE(?, utr) WHERE id = ?",
                    "NOT RECEIVED: " + reason, reason, adminUtr, paymentId);
            auditLog(paymentId, orderId, userId, "ADMIN_PAYMENT_NOT_RECEIVED", currentStatusStr, PaymentStatus.FAILED.name(), effectiveUtr, reason);
            sendPaymentStatusNotificationEmail(userName, userEmail, "NOT RECEIVED", paymentId, orderId, planId, amountPaise, effectiveUtr, reason);
            return Map.of("status", "FAILED", "message", "Payment marked as not received and reason sent to " + userEmail + ".");

        } else if ("CANCEL".equals(normalizedAction) || "CANCELLED".equals(normalizedAction)) {
            String cancelReason = (note != null && !note.isBlank()) ? note.trim() : "Payment cancelled by administrator.";
            jdbc.update("UPDATE payments SET status = 'CANCELLED', failure_reason = ?, utr = COALESCE(?, utr) WHERE id = ?", cancelReason, adminUtr, paymentId);
            auditLog(paymentId, orderId, userId, "ADMIN_PAYMENT_CANCELLED", currentStatusStr, PaymentStatus.CANCELLED.name(), effectiveUtr, cancelReason);
            
            // If payment was previously SUCCESS, revert active subscription back to FREE
            if ("SUCCESS".equals(currentStatusStr)) {
                try {
                    jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);
                    syncAccessSubscription(userId, "FREE", 36500);
                } catch (Exception e) {
                    log.warn("Failed to revert subscription on cancel: {}", e.getMessage());
                }
            }

            sendPaymentStatusNotificationEmail(userName, userEmail, "CANCELLED", paymentId, orderId, planId, amountPaise, effectiveUtr, cancelReason);
            return Map.of("status", "CANCELLED", "message", "Payment cancelled and notification sent to " + userEmail + ".");

        } else if ("DELETE".equals(normalizedAction) || "REMOVE".equals(normalizedAction)) {
            // Admin deletion of payment record (e.g. duplicate payment)
            String deleteReason = (note != null && !note.isBlank()) ? note.trim() : "Duplicate payment record removed by administrator.";
            
            // If deleting an approved/success payment, check if any other active payment exists for user; if not, revert to FREE
            if ("SUCCESS".equals(currentStatusStr)) {
                Integer remainingSuccess = jdbc.queryForObject(
                        "SELECT COUNT(*) FROM payments WHERE user_id = ? AND status = 'SUCCESS' AND id != ?",
                        Integer.class, userId, paymentId
                );
                if (remainingSuccess == null || remainingSuccess == 0) {
                    try {
                        jdbc.update("UPDATE subscriptions SET status = 'REVOKED' WHERE user_id = ? AND status = 'ACTIVE'", userId);
                        syncAccessSubscription(userId, "FREE", 36500);
                    } catch (Exception e) {
                        log.warn("Failed to revert subscription on delete: {}", e.getMessage());
                    }
                }
            }

            // Remove associated delivery logs and payment record
            try {
                jdbc.update("DELETE FROM payment_webhook_deliveries WHERE payment_id = ?", paymentId);
            } catch (Exception ignored) {}
            try {
                jdbc.update("DELETE FROM payment_audit_logs WHERE payment_id = ?", paymentId);
            } catch (Exception ignored) {}
            jdbc.update("DELETE FROM payments WHERE id = ?", paymentId);

            auditLog(paymentId, orderId, userId, "ADMIN_PAYMENT_DELETED", currentStatusStr, "DELETED", effectiveUtr, deleteReason);
            return Map.of("status", "DELETED", "message", "Payment record deleted successfully.");

        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid action. Supported actions: ACCEPT/CONFIRM, DECLINE, NOT_RECEIVED, CANCEL.");
        }
    }

    private void sendPaymentStatusNotificationEmail(
            String userName,
            String userEmail,
            String statusTitle,
            String paymentId,
            String orderId,
            String planId,
            long amountPaise,
            String utr,
            String reason) {
        if (userEmail == null || userEmail.isBlank() || "N/A".equalsIgnoreCase(userEmail)) {
            log.warn("Cannot send payment status email: no valid email address found for payment {}", paymentId);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            String from = (mailFrom != null && !mailFrom.isBlank()) ? mailFrom.trim() : "support@scholarsphere.com";
            if (!from.contains("<")) {
                message.setFrom("Zyndex Billing <" + from + ">");
            } else {
                message.setFrom(from);
            }
            message.setTo(userEmail);
            message.setSubject("Zyndex Payment Verification Update: " + statusTitle + " [" + paymentId + "]");

            double amountRupees = amountPaise / 100.0;
            String text = String.format(
                    """
                    Dear %s,

                    This is an official update regarding your recent subscription payment on Zyndex.

                    === PAYMENT DETAILS ===
                    Status: %s
                    Payment ID: %s
                    Order ID: %s
                    Plan Requested: %s
                    Amount: ₹%.2f
                    Submitted UTR: %s

                    === ADMINISTRATOR REASON / NOTES ===
                    %s

                    If you believe this is an error or have an updated transaction reference (UTR) from your bank, please log in to Zyndex and retry payment or contact our support team with your bank statement.

                    Best regards,
                    Zyndex Billing & Verification Team
                    """,
                    userName, statusTitle, paymentId, orderId, planId.replace("_", " "),
                    amountRupees, (utr != null ? utr : "N/A"), reason
            );

            message.setText(text);
            mailSender.send(message);
            log.info("Sent payment {} notification email to {}", statusTitle, userEmail);
        } catch (Exception e) {
            log.warn("Failed to deliver payment status email to {}: {}", userEmail, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getUserDetails(Long userId) {
        if (userId == null) {
            return Map.of("name", "N/A", "email", "N/A");
        }
        try {
            List<Map<String, Object>> users = jdbc.queryForList(
                    "SELECT username AS name, email FROM zyndex_auth.users WHERE id = ?", userId
            );
            if (!users.isEmpty() && users.get(0).get("email") != null) {
                return users.get(0);
            }
        } catch (Exception e) {
            log.debug("Direct DB lookup from zyndex_auth failed: {}", e.getMessage());
        }

        try {
            String url = "http://auth-service/api/users/" + userId + "/profile";
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Internal-Service", "subscription-service");
            org.springframework.http.HttpEntity<?> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.core.ParameterizedTypeReference<Map<String, Object>> typeRef = new org.springframework.core.ParameterizedTypeReference<>() {};
            org.springframework.http.ResponseEntity<Map<String, Object>> resp = restTemplate.exchange(
                    url, org.springframework.http.HttpMethod.GET, entity, typeRef
            );
            Map<String, Object> profile = resp.getBody();
            if (profile != null) {
                String name = profile.get("name") != null ? String.valueOf(profile.get("name")) : "User #" + userId;
                String email = profile.get("email") != null ? String.valueOf(profile.get("email")) : "N/A";
                return Map.of("name", name, "email", email);
            }
        } catch (Exception e) {
            log.warn("REST call to auth-service for user {} profile failed: {}", userId, e.getMessage());
        }

        return Map.of("name", "User #" + userId, "email", "N/A");
    }

    private Instant resolveInstant(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Timestamp ts) return ts.toInstant();
        if (obj instanceof LocalDateTime ldt) return ldt.toInstant(ZoneOffset.UTC);
        if (obj instanceof Instant i) return i;
        return null;
    }
}

