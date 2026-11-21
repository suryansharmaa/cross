package com.Cross.backend.config;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cross.cors")
public record CorsProperties(String frontendOrigin) {}
