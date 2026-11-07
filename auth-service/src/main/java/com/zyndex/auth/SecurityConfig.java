package com.zyndex.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtRequestFilter jwtRequestFilter;

    public SecurityConfig(JwtRequestFilter jwtRequestFilter) {
        this.jwtRequestFilter = jwtRequestFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .cors(cors -> cors.disable()) // CORS is handled centrally at the API Gateway level!
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/register",
                    "/api/auth/admin-request",
                    "/api/users/internal/plan-upgrade-email",
                    "/api/auth/login",
                    "/api/auth/check-login",
                    "/api/auth/account-details",
                    "/api/auth/verify-code",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/api/send-otp",
                    "/api/verify-otp",
                    "/api/users/maintenance-mode",
                    "/api/auth/check-status",
                    "/api/auth/check-trusted-device",
                    "/api/auth/trust-device",
                    "/actuator/health",
                    "/actuator/info",
                    "/api/health"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
