package com.zyndex.content;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "zyndex")
public record AppProperties(
        String uploadDir,
        String mainAdminEmail,
        String otpMailFrom
) {}
