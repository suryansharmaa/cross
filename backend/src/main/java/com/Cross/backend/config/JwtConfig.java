package com.Cross.backend.config;
import com.Cross.backend.user.service.UserService;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.UUID;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(JwtProperties.class)
public class JwtConfig {
    private static final OAuth2TokenValidatorResult INVALID = OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Invalid access token", null));

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    SecretKey jwtKey(JwtProperties properties) {
        String secret = properties.secret();
        if (secret == null || secret.isBlank() || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
        }
        Duration lifetime = properties.lifetime();
        if (lifetime == null || lifetime.getSeconds() < 1 || lifetime.getNano() != 0) {
            throw new IllegalStateException("JWT lifetime must be a positive whole number of seconds");
        }
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtKey) {
        return NimbusJwtEncoder.withSecretKey(jwtKey).algorithm(MacAlgorithm.HS256).build();
    }

    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtKey, Clock clock, UserService users) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(jwt -> {
            if (jwt.getExpiresAt() == null || !clock.instant().isBefore(jwt.getExpiresAt())
                    || jwt.getSubject() == null) return INVALID;

            UUID subject;
            try {
                subject = UUID.fromString(jwt.getSubject());
            } catch (IllegalArgumentException exception) {
                return INVALID;
            }
            if (!subject.toString().equals(jwt.getSubject()) || !users.exists(subject)) return INVALID;
            return OAuth2TokenValidatorResult.success();
        });
        return decoder;
    }
}
