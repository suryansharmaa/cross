package com.Cross.backend.config;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("cross.jwt")
public record JwtProperties(String secret, Duration lifetime) {
    @Override
    public String toString() {
        return "JwtProperties[lifetime=" + lifetime + "]";
    }
}
