package com.zyndex.subscription;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = SubscriptionServiceApplication.class)
@AutoConfigureMockMvc
public class SubscriptionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @SuppressWarnings("removal")
    @MockBean
    private JavaMailSender mailSender;

    private static final String GATEWAY_SECRET = "zyndex-gateway-secret-123";

    @BeforeEach
    public void setup() {
        jdbc.execute("DELETE FROM payments");
        jdbc.execute("DELETE FROM subscriptions");
    }

    @Test
    public void testCheckoutAuthentication() throws Exception {
        // Unauthenticated user cannot create checkout
        mockMvc.perform(post("/api/subscriptions/checkout")
                .header("X-Gateway-Secret", GATEWAY_SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"planId\":\"STUDENT_PLUS\"}"))
                .andExpect(status().isUnauthorized());

        // Authenticated user can create checkout
        mockMvc.perform(post("/api/subscriptions/checkout")
                .header("X-User-Id", "123")
                .header("X-Gateway-Secret", GATEWAY_SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"planId\":\"STUDENT_PLUS\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId").exists())
                .andExpect(jsonPath("$.qrUrl").exists())
                .andExpect(jsonPath("$.amount").value(19900)); // Uses backend plan price (₹199 = 19900 paise)
    }

    @Test
    public void testPaymentStatus() throws Exception {
        String paymentId = "PAY_TEST_STATUS";
        jdbc.update("INSERT INTO payments (id, user_id, gateway, gateway_payment_id, gateway_order_id, gateway_qr_id, amount_paise, payment_method, status, expires_at, plan_id) " +
                "VALUES (?, 123, 'SIMULATED', 'PAY_TEST_STATUS', 'ORD_TEST_STATUS', 'qr_status', 19900, 'UPI', 'PENDING', DATE_ADD(NOW(), INTERVAL 1 HOUR), 'STUDENT_PLUS')",
                paymentId);

        // Payment status endpoint returns correct state
        mockMvc.perform(get("/api/subscriptions/payment-status/" + paymentId)
                .header("X-User-Id", "123")
                .header("X-Gateway-Secret", GATEWAY_SECRET))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    public void testWebhookIdempotencyAndVerification() throws Exception {
        // Create pending payment
        jdbc.update("INSERT INTO payments (id, user_id, gateway, gateway_payment_id, gateway_order_id, gateway_qr_id, amount_paise, payment_method, status, expires_at, plan_id) " +
                "VALUES ('PAY_ID', 123, 'SIMULATED', 'pay_real', 'order_real', 'qr_real', 19900, 'UPI', 'PENDING', DATE_ADD(NOW(), INTERVAL 1 HOUR), 'STUDENT_PLUS')");

        // Invalid signature rejected
        mockMvc.perform(post("/api/subscriptions/webhook")
                .header("X-Razorpay-Signature", "wrong_signature")
                .header("X-Gateway-Secret", GATEWAY_SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"event\":\"order.paid\",\"id\":\"evt_1\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_real\",\"amount\":19900,\"currency\":\"INR\",\"order_id\":\"order_real\"}}}}"))
                .andExpect(status().isUnauthorized());

        // Call mock webhook directly
        mockMvc.perform(post("/api/subscriptions/webhook")
                .header("X-Gateway-Secret", GATEWAY_SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"event\":{\"paymentId\":\"pay_real\",\"orderId\":\"order_real\",\"status\":\"SUCCESS\",\"planId\":\"STUDENT_PLUS\"}}"))
                .andExpect(status().isOk());

        // Check if subscription activated
        mockMvc.perform(get("/api/subscriptions/me")
                .header("X-User-Id", "123")
                .header("X-Gateway-Secret", GATEWAY_SECRET))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.plan_id").value("STUDENT_PLUS"));

        // Duplicate webhook ignored
        mockMvc.perform(post("/api/subscriptions/webhook")
                .header("X-Gateway-Secret", GATEWAY_SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"event\":{\"paymentId\":\"pay_real\",\"orderId\":\"order_real\",\"status\":\"SUCCESS\",\"planId\":\"STUDENT_PLUS\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Duplicate event ignored."));
    }
}
