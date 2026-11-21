package com.Cross.backend.config;

import com.Cross.backend.user.service.UserService;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;

class JwtConfigTests {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(context -> {
                var sources = context.getEnvironment().getPropertySources();
                sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
                sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
                new ConfigDataApplicationContextInitializer().initialize(context);
            })
            .withUserConfiguration(JwtConfig.class)
            .withBean(UserService.class, () -> mock(UserService.class));

    @Test
    void failsStartupWhenJwtSecretIsMissing() {
        contextRunner.run(context -> assertThat(context).hasFailed()
                .getFailure().hasRootCauseInstanceOf(IllegalStateException.class)
                .hasStackTraceContaining("JWT_SECRET"));
    }

    @Test
    void failsStartupWhenJwtSecretIsShorterThan32Bytes() {
        contextRunner.withPropertyValues("JWT_SECRET=" + "x".repeat(31))
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseInstanceOf(IllegalStateException.class)
                        .hasStackTraceContaining("JWT_SECRET"));
    }

    @Test
    void rejectsMissingBlankAndShortKeys() {
        JwtConfig config = new JwtConfig();
        for (String value : new String[] {null, " ".repeat(32), "é".repeat(15)}) {
            assertThatThrownBy(() -> config.jwtKey(new JwtProperties(value, Duration.ofMinutes(15))))
                    .isInstanceOf(IllegalStateException.class).hasMessageContaining("JWT_SECRET");
        }
        assertThat(config.jwtKey(new JwtProperties("é".repeat(16), Duration.ofMinutes(15)))
                .getEncoded()).hasSize(32);
    }
}
