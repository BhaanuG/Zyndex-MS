package com.zyndex.access;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class GatewaySecretFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String userId = httpRequest.getHeader("X-User-Id");
        String userRole = httpRequest.getHeader("X-User-Role");
        String gatewaySecret = httpRequest.getHeader("X-Gateway-Secret");

        String expectedSecret = System.getenv("GATEWAY_SECRET") != null 
                ? System.getenv("GATEWAY_SECRET") 
                : "zyndex-gateway-secret-123";

        if ((userId != null || userRole != null) && !expectedSecret.equals(gatewaySecret)) {
            httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"Direct access bypass attempt rejected.\"}");
            return;
        }

        chain.doFilter(request, response);
    }
}
