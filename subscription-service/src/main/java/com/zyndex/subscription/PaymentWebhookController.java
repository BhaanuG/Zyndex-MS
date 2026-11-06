package com.zyndex.subscription;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.util.Map;

@RestController
public class PaymentWebhookController {

    private final PaymentService paymentService;

    public PaymentWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    /**
     * Authoritative Webhook endpoint for payment callbacks and simulator events.
     * Supports:
     * - /api/webhooks
     * - /api/payments/webhook
     * - /api/subscriptions/webhook
     */
    @PostMapping(path = {
            "/api/webhooks",
            "/api/webhooks/",
            "/api/payments/webhook",
            "/api/subscriptions/webhook"
    })
    public ResponseEntity<Map<String, Object>> handleWebhook(
            HttpServletRequest request,
            @RequestHeader(name = "X-Gateway-Signature", required = false) String signature,
            @RequestHeader(name = "X-Gateway-Signature-V2", required = false) String signatureV2,
            @RequestHeader(name = "X-Gateway-Timestamp", required = false) String timestamp,
            @RequestHeader(name = "X-Gateway-Delivery-Id", required = false) String deliveryId,
            @RequestHeader(name = "X-Gateway-Event", required = false) String eventHeader) {

        try {
            InputStream is = request.getInputStream();
            byte[] rawBytes = is.readAllBytes();

            Map<String, Object> result = paymentService.processWebhook(
                    rawBytes,
                    signature,
                    signatureV2,
                    timestamp,
                    deliveryId,
                    eventHeader
            );

            return ResponseEntity.ok(result);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Webhook processing failed: " + e.getMessage());
        }
    }
}
