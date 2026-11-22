package com.Cross.backend.notification.service;

import com.Cross.backend.notification.repository.NotificationRepository;
import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.user.entity.User;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReminderSubscriptionProcessorTests {
    private final SubscriptionRepository subscriptions = mock(SubscriptionRepository.class);
    private final NotificationRepository notifications = mock(NotificationRepository.class);
    private final Clock clock = Clock.fixed(Instant.EPOCH, ZoneOffset.UTC);
    private final ReminderSubscriptionProcessor processor =
            new ReminderSubscriptionProcessor(subscriptions, notifications, clock);

    @ParameterizedTest
    @CsvSource({
        "3,THREE_DAYS,in 3 days", "2,THREE_DAYS,in 2 days", "1,ONE_DAY,tomorrow", "0,ONE_DAY,today"
    })
    void formatsBothKindsForEachDay(int days, String alert, String when) {
        LocalDate today = LocalDate.of(2024, 2, 26);
        for (boolean trial : List.of(false, true)) {
            UUID id = UUID.randomUUID();
            UUID ownerId = UUID.randomUUID();
            User owner = mock(User.class);
            when(owner.getId()).thenReturn(ownerId);
            var subscription = subscription(owner, today, days, trial);
            when(subscriptions.findForReminder(id)).thenReturn(Optional.of(subscription));
            when(notifications.insertAlert(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);

            assertThat(processor.process(id, today)).isTrue();
            String message = trial
                    ? "Your <Music> trial ends " + when + ". You will be charged INR 5.00 unless you cancel."
                    : "<Music> renews " + when + " for INR 5.00.";
            verify(notifications).insertAlert(any(), eq(ownerId), eq(id), eq(today.plusDays(days)), eq(alert),
                    eq(trial ? "TRIAL_ENDING" : "RENEWAL"), eq(message), eq(Instant.EPOCH));
        }
    }

    @ParameterizedTest
    @CsvSource({"true,true,0", "false,true,0", "true,false,4", "false,false,4"})
    void skipsCancelledAndOutsideWindow(boolean trial, boolean cancelled, int days) {
        UUID id = UUID.randomUUID();
        LocalDate today = LocalDate.of(2024, 2, 26);
        var subscription = subscription(mock(User.class), today, days, trial);
        if (cancelled) subscription.cancel(Instant.EPOCH);
        when(subscriptions.findForReminder(id)).thenReturn(Optional.of(subscription));
        assertThat(processor.process(id, today)).isFalse();
        verifyNoInteractions(notifications);
    }

    private Subscription subscription(User owner, LocalDate today, int days, boolean trial) {
        var subscription = new Subscription(owner, Instant.EPOCH);
        LocalDate billing = today.plusDays(days);
        subscription.update("<Music>", SubscriptionCategory.MUSIC, BigDecimal.valueOf(5),
                BillingCycle.MONTHLY, trial ? today.minusDays(5) : billing,
                trial, trial ? billing : null, null, Instant.EPOCH);
        return subscription;
    }

    @org.junit.jupiter.api.Test
    void usesMonthEndAndLabelsConvertedTrialAsRenewal() {
        UUID id = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(ownerId);
        LocalDate anchor = LocalDate.of(2024, 1, 31);
        var subscription = subscription(owner, anchor, 0, true);
        when(subscriptions.findForReminder(id)).thenReturn(Optional.of(subscription));
        when(notifications.insertAlert(any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(1);

        for (LocalDate billing : List.of(LocalDate.of(2024, 2, 29), LocalDate.of(2024, 3, 31))) {
            assertThat(processor.process(id, billing.minusDays(1))).isTrue();
            verify(notifications).insertAlert(any(), eq(ownerId), eq(id), eq(billing), eq("ONE_DAY"),
                    eq("RENEWAL"), eq("<Music> renews tomorrow for INR 5.00."), eq(Instant.EPOCH));
        }
    }
}
