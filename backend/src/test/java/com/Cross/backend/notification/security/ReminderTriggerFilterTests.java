package com.Cross.backend.notification.security;

import com.Cross.backend.common.SecurityProblemHandlers;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.*;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ReminderTriggerFilterTests {
    private final SecurityProblemHandlers problems = mock(SecurityProblemHandlers.class);

    @Test
    void absentTokenDisablesTrigger() throws Exception {
        var request = new MockHttpServletRequest("POST", "/api/v1/internal/reminders/run");
        var response = new MockHttpServletResponse();
        var chain = new MockFilterChain();
        new ReminderTriggerFilter(problems, null).doFilter(request, response, chain);
        verify(problems).write(response, HttpStatus.NOT_FOUND,
                "reminder_trigger_disabled", "Reminder trigger not found.");
        org.assertj.core.api.Assertions.assertThat(chain.getRequest()).isNull();
    }

    @Test
    void rejectsShortConfigurationWithoutIncludingItsValue() {
        for (String token : new String[]{"", "unique-short-fixture", "é".repeat(15)}) {
            assertThatThrownBy(() -> new ReminderTriggerFilter(problems, token))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("REMINDER_TRIGGER_TOKEN must contain at least 32 UTF-8 bytes");
        }
        new ReminderTriggerFilter(problems, "é".repeat(16));
    }
}
