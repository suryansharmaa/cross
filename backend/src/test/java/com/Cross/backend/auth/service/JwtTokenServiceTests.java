package com.Cross.backend.auth.service;

import com.Cross.backend.config.*;
import com.Cross.backend.user.service.UserService;
import java.time.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringJUnitConfig(classes = JwtConfig.class, initializers = ConfigDataApplicationContextInitializer.class)
@ActiveProfiles("test")
class JwtTokenServiceTests {
    @Autowired JwtProperties properties;
    @Autowired JwtEncoder encoder;
    @MockitoBean UserService users;
    @MockitoBean Clock clock;

    @Test
    void issuesExpectedClaimsAndRejectsInvalidTokens() {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        UUID id = UUID.randomUUID();
        when(clock.instant()).thenReturn(now);
        when(users.exists(id)).thenReturn(true);
        var token = new JwtTokenService(encoder, properties, clock).issue(id);
        assertThat(decoder.decode(token.accessToken()).getSubject()).isEqualTo(id.toString());
        assertThat(token.expiresAt()).isEqualTo(now.plus(properties.lifetime()));
        String[] parts = token.accessToken().split("\\.");
        String changed = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        assertThatThrownBy(() -> decoder.decode(parts[0] + "." + parts[1] + "." + changed))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign(JwtClaimsSet.builder().subject(id.toString()).issuedAt(now))))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign(JwtClaimsSet.builder().subject("invalid").expiresAt(token.expiresAt()))))
                .isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign(JwtClaimsSet.builder().expiresAt(token.expiresAt()))))
                .isInstanceOf(JwtException.class);
        when(clock.instant()).thenReturn(token.expiresAt());
        assertThatThrownBy(() -> decoder.decode(token.accessToken())).isInstanceOf(JwtException.class);
    }

    @Autowired JwtDecoder decoder;

    private String sign(JwtClaimsSet.Builder claims) {
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),
                claims.build())).getTokenValue();
    }
}
