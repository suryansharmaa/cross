package com.Cross.backend.dashboard.service;

import com.Cross.backend.dashboard.dto.DashboardResponse.UpcomingRenewalResponse;
import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static com.Cross.backend.subscription.entity.BillingCycle.*;
import static com.Cross.backend.subscription.entity.SubscriptionCategory.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DashboardServiceTests {
    private static final Instant MIDNIGHT = Instant.parse("2026-11-21T18:30:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 22);
    private final UUID owner = UUID.randomUUID();
    private final SubscriptionRepository subscriptions = mock(SubscriptionRepository.class);

    @Test
    void normalizesCyclesAndSortsGroupedCategories() {
        var response = dashboard(
                plan("Weekly", PRODUCTIVITY, "100.00", WEEKLY, TODAY, null),
                plan("Monthly", MUSIC, "50.00", MONTHLY, TODAY, null),
                plan("Yearly", MUSIC, "120.00", YEARLY, TODAY, null),
                plan("Future", EDUCATION, "60.00", MONTHLY, TODAY.plusDays(60), null));
        assertThat(response.yearlySpend()).isEqualTo(new BigDecimal("6640.00"));
        assertThat(response.monthlySpend()).isEqualTo(new BigDecimal("553.33"));
        var rows = response.categoryBreakdown();
        assertThat(rows).extracting(row -> row.category()).containsExactly(PRODUCTIVITY, EDUCATION, MUSIC);
        assertThat(rows.get(0).yearlySpend()).isEqualTo(new BigDecimal("5200.00"));
        assertThat(rows.get(0).monthlySpend()).isEqualTo(new BigDecimal("433.33"));
        assertThat(rows.get(1).yearlySpend()).isEqualTo(new BigDecimal("720.00"));
        assertThat(rows.get(1).monthlySpend()).isEqualTo(new BigDecimal("60.00"));
        assertThat(rows.get(2).count()).isEqualTo(2);
        assertThat(rows.get(2).monthlySpend()).isEqualTo(new BigDecimal("60.00"));
        verify(subscriptions, only()).findByUser_IdAndStatus(owner, SubscriptionStatus.ACTIVE);
    }

    @Test
    void roundsHalfUpAfterSummingExactAnnualAmounts() {
        var response = dashboard(
                plan("Below half", MUSIC, "0.05", YEARLY, TODAY, null),
                plan("At half", EDUCATION, "0.06", YEARLY, TODAY, null));
        assertThat(response.categoryBreakdown()).extracting(row -> row.monthlySpend())
                .containsExactly(new BigDecimal("0.01"), new BigDecimal("0.00"));

        response = dashboard(
                plan("First", MUSIC, "0.01", WEEKLY, TODAY, null),
                plan("Second", MUSIC, "0.01", WEEKLY, TODAY, null),
                plan("Pending first", OTHER, "0.01", WEEKLY, TODAY, TODAY.plusDays(5)),
                plan("Pending second", OTHER, "0.01", WEEKLY, TODAY, TODAY.plusDays(31)));
        assertThat(response.yearlySpend()).isEqualTo(new BigDecimal("1.04"));
        assertThat(response.monthlySpend()).isEqualTo(new BigDecimal("0.09"));
        assertThat(response.categoryBreakdown()).singleElement()
                .satisfies(row -> assertThat(row.monthlySpend()).isEqualTo(new BigDecimal("0.09")));
        assertThat(response.trialsPending().count()).isEqualTo(2);
        assertThat(response.trialsPending().monthlyIfConverted()).isEqualTo(new BigDecimal("0.09"));
        assertThat(response.upcomingRenewals()).extracting(UpcomingRenewalResponse::name)
                .containsExactly("First", "Second", "Pending first");
    }

    @Test
    void appliesKolkataMidnightToTrialsAndRenewals() {
        var trial = plan("Ends today", MUSIC, "10.00", MONTHLY, TODAY.minusDays(10), TODAY);
        var converted = plan("Ended yesterday", MUSIC, "120.00", YEARLY, TODAY.minusDays(10), TODAY.minusDays(1));
        var boundary = plan("Boundary", OTHER, "1.00", MONTHLY, TODAY.plusDays(30), null);
        var after = dashboard(trial, converted, boundary);
        var before = new DashboardService(subscriptions, Clock.fixed(MIDNIGHT.minusSeconds(1), ZoneOffset.UTC)).get(owner);
        assertThat(before.generatedOn()).isEqualTo(TODAY.minusDays(1));
        assertThat(before.trialsPending().count()).isEqualTo(1);
        assertThat(before.monthlySpend()).isEqualTo(new BigDecimal("11.00"));
        assertThat(before.upcomingRenewals()).extracting(UpcomingRenewalResponse::name)
                .containsExactly("Ended yesterday", "Ends today");
        assertThat(after.generatedOn()).isEqualTo(TODAY);
        assertThat(after.activeCount()).isEqualTo(3);
        assertThat(after.trialsPending().count()).isZero();
        assertThat(after.monthlySpend()).isEqualTo(new BigDecimal("21.00"));
        assertThat(after.upcomingRenewals()).extracting(UpcomingRenewalResponse::daysUntil).containsExactly(0L, 30L);
    }

    @Test
    void sortsRenewalsByDateThenBothNameComparisonsThenId() {
        var lowercase = plan("apple", MUSIC, "1.00", WEEKLY, TODAY, null);
        var uppercase = plan("Apple", MUSIC, "1.00", MONTHLY, TODAY, null);
        var sameName = plan("apple", MUSIC, "1.00", YEARLY, TODAY, null);
        var banana = plan("banana", MUSIC, "1.00", MONTHLY, TODAY, null);
        var zoo = plan("Zoo", MUSIC, "1.00", MONTHLY, TODAY, null);
        var later = plan("Aardvark", MUSIC, "1.00", MONTHLY, TODAY.plusDays(1), null);
        ReflectionTestUtils.setField(lowercase, "id", new UUID(0, 1));
        ReflectionTestUtils.setField(sameName, "id", new UUID(0, 2));
        ReflectionTestUtils.setField(uppercase, "id", new UUID(0, 3));

        assertThat(dashboard(zoo, banana, lowercase).upcomingRenewals())
                .extracting(UpcomingRenewalResponse::name).containsExactly("apple", "banana", "Zoo");
        assertThat(dashboard(later, sameName, zoo, banana, lowercase, uppercase).upcomingRenewals())
                .extracting(UpcomingRenewalResponse::id)
                .containsExactly(uppercase.getId(), lowercase.getId(), sameName.getId(),
                        banana.getId(), zoo.getId(), later.getId());
    }

    @Test
    void usesOriginalAnchorsForMonthEndAndLeapYearRenewals() {
        var monthly = plan("Monthly", MUSIC, "1.00", MONTHLY, LocalDate.of(2024, 1, 31), null);
        var yearly = plan("Yearly", MUSIC, "1.00", YEARLY, LocalDate.of(2020, 2, 29), null);
        when(subscriptions.findByUser_IdAndStatus(owner, SubscriptionStatus.ACTIVE)).thenReturn(List.of(monthly, yearly));
        var clock = Clock.fixed(Instant.parse("2024-02-28T00:00:00Z"), ZoneOffset.UTC);
        assertThat(new DashboardService(subscriptions, clock).get(owner).upcomingRenewals())
                .extracting(UpcomingRenewalResponse::nextBillingDate)
                .containsExactly(LocalDate.of(2024, 2, 29), LocalDate.of(2024, 2, 29));
    }

    @Test
    void returnsScaledZerosAndHandlesMaximumWeeklySpend() {
        var empty = dashboard();
        assertThat(empty.activeCount()).isZero();
        assertThat(empty.categoryBreakdown()).isEmpty();
        assertThat(empty.upcomingRenewals()).isEmpty();
        assertThat(empty.trialsPending().count()).isZero();
        assertThat(List.of(empty.monthlySpend(), empty.yearlySpend(), empty.trialsPending().monthlyIfConverted()))
                .containsOnly(new BigDecimal("0.00"));
        var maximum = dashboard(IntStream.range(0, 100)
                .mapToObj(i -> plan("Maximum", MUSIC, "9999999.99", WEEKLY, TODAY, null))
                .toArray(Subscription[]::new));
        assertThat(maximum.activeCount()).isEqualTo(100);
        assertThat(maximum.yearlySpend()).isEqualTo(new BigDecimal("51999999948.00"));
        assertThat(maximum.monthlySpend()).isEqualTo(new BigDecimal("4333333329.00"));
    }

    private com.Cross.backend.dashboard.dto.DashboardResponse dashboard(Subscription... active) {
        when(subscriptions.findByUser_IdAndStatus(owner, SubscriptionStatus.ACTIVE)).thenReturn(List.of(active));
        return new DashboardService(subscriptions, Clock.fixed(MIDNIGHT, ZoneOffset.UTC)).get(owner);
    }

    private Subscription plan(String name, SubscriptionCategory category, String amount, BillingCycle cycle,
            LocalDate start, LocalDate trialEnd) {
        var subscription = new Subscription(null, MIDNIGHT);
        subscription.update(name, category, new BigDecimal(amount), cycle, start, trialEnd != null, trialEnd, null, MIDNIGHT);
        ReflectionTestUtils.setField(subscription, "id", UUID.randomUUID());
        return subscription;
    }
}
