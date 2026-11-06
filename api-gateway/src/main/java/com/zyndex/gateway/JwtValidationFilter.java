package com.zyndex.gateway;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtValidationFilter implements GlobalFilter, Ordered {

    @Value("${zyndex.jwt-secret:replace-this-with-a-long-random-secret}")
    private String jwtSecret;

    private static final List<String> PUBLIC_PATH_PREFIXES = List.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/admin-request",
            "/api/auth/account-details",
            "/api/auth/verify-code",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/send-otp",
            "/api/verify-otp",
            "/api/health",
            "/api/feedback/contact",
            "/api/resources/categories",
            "/api/resources/featured",
            "/api/resources/search",
            "/api/subscriptions/plans",
            "/api/subscriptions/webhook",
            "/api/webhooks",
            "/api/payments/webhook"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        String gatewaySecret = System.getenv("GATEWAY_SECRET") != null 
                ? System.getenv("GATEWAY_SECRET") 
                : "zyndex-gateway-secret-123";

        // Strip client-supplied security headers to prevent HTTP header spoofing and inject Gateway Secret
        ServerHttpRequest.Builder requestBuilder = request.mutate();
        requestBuilder.header("X-Gateway-Secret", gatewaySecret);

        if (request.getHeaders().containsKey("X-User-Id")) {
            requestBuilder.headers(headers -> headers.remove("X-User-Id"));
        }
        if (request.getHeaders().containsKey("X-User-Role")) {
            requestBuilder.headers(headers -> headers.remove("X-User-Role"));
        }
        if (request.getHeaders().containsKey("X-User-Email")) {
            requestBuilder.headers(headers -> headers.remove("X-User-Email"));
        }
        if (request.getHeaders().containsKey("X-User-Name")) {
            requestBuilder.headers(headers -> headers.remove("X-User-Name"));
        }

        request = requestBuilder.build();
        exchange = exchange.mutate().request(request).build();

        // Check if path is public
        boolean isPublic = isPublicPath(path);

        String token = extractToken(request);

        boolean isSecureFileRequest = path.matches("^/api/resources/\\d+/(file|download)$");
        if (isSecureFileRequest && token != null && !token.contains(".")) {
            return chain.filter(exchange);
        }

        if (token == null) {
            if (isPublic) {
                return chain.filter(exchange);
            }
            return onError(exchange, "Authorization token is missing", HttpStatus.UNAUTHORIZED);
        }

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // Inject user info as headers for downstream microservices
            ServerHttpRequest mutatedRequest = request.mutate()
                    .header("X-User-Id", String.valueOf(claims.getSubject()))
                    .header("X-User-Role", String.valueOf(claims.get("role")))
                    .header("X-User-Email", String.valueOf(claims.get("email")))
                    .header("X-User-Name", String.valueOf(claims.get("name")))
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            if (isPublic) {
                return chain.filter(exchange);
            }
            return onError(exchange, "Invalid or expired authorization token", HttpStatus.UNAUTHORIZED);
        }
    }

    private boolean isPublicPath(String path) {
        if (path.equals("/api/resources") || path.equals("/api/resources/")) {
            return true;
        }
        for (String prefix : PUBLIC_PATH_PREFIXES) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        // Category paths /api/resources/category/... and ratings paths /api/resources/.../ratings are public
        if (path.startsWith("/api/resources/category/")) {
            return true;
        }
        if (path.matches("^/api/resources/\\d+/ratings$")) {
            return true;
        }
        return false;
    }

    private String extractToken(ServerHttpRequest request) {
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        // Fallback to query param (e.g. for preview iframe)
        return request.getQueryParams().getFirst("token");
    }

    private SecretKey secretKey() {
        byte[] seed = jwtSecret.getBytes(StandardCharsets.UTF_8);
        byte[] key = new byte[Math.max(32, seed.length)];
        System.arraycopy(seed, 0, key, 0, seed.length);
        return Keys.hmacShaKeyFor(key);
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().add(HttpHeaders.CONTENT_TYPE, "application/json");
        String path = exchange.getRequest().getURI().getPath();
        String timestamp = java.time.Instant.now().toString();
        String body = String.format(
            "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"code\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
            timestamp, status.value(), status.getReasonPhrase(), status.name(), err, path
        );
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8))));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
