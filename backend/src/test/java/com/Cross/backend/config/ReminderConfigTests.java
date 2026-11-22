package com.Cross.backend.config;

import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.notification.service.ReminderSchedule;
import com.Cross.backend.notification.service.ReminderService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ReminderConfigTests {
    private final WebApplicationContextRunner contextRunner = new WebApplicationContextRunner()
            .withInitializer(context -> {
                var sources = context.getEnvironment().getPropertySources();
                sources.remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
                sources.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
            })
            .withUserConfiguration(TestSecurity.class, SecurityConfig.class, ReminderConfig.class, ReminderSchedule.class)
            .withPropertyValues("cross.cors.frontend-origin=http://localhost:5173",
                    "cross.reminders.scheduler-enabled=false")
            .withBean(SecurityProblemHandlers.class, () -> mock(SecurityProblemHandlers.class))
            .withBean(JwtDecoder.class, () -> mock(JwtDecoder.class))
            .withBean(ReminderService.class, () -> mock(ReminderService.class));

    @Test
    void startsWithoutTokenAndLeavesSchedulerDisabled() {
        contextRunner.run(context -> assertThat(context).hasNotFailed().doesNotHaveBean(ReminderSchedule.class));
    }

    @Test
    void failsStartupWithAShortTokenWithoutExposingIt() {
        String token = "short-trigger-test-fixture";
        contextRunner.withPropertyValues("REMINDER_TRIGGER_TOKEN=" + token)
                .run(context -> {
                    assertThat(context).hasFailed().getFailure()
                            .hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasStackTraceContaining("REMINDER_TRIGGER_TOKEN must contain at least 32 UTF-8 bytes");
                    var trace = new java.io.StringWriter();
                    context.getStartupFailure().printStackTrace(new java.io.PrintWriter(trace));
                    assertThat(trace.toString()).doesNotContain(token);
                });
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableWebSecurity
    static class TestSecurity {}
}
