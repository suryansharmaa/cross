package com.Cross.backend.subscription.service;

import com.Cross.backend.subscription.entity.BillingCycle;
import com.Cross.backend.subscription.entity.Subscription;
import com.Cross.backend.subscription.entity.SubscriptionStatus;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

public final class BillingDateCalculator {
    private BillingDateCalculator() {}

    public static LocalDate nextBillingDate(Subscription subscription, LocalDate from) {
        if (subscription.getStatus() == SubscriptionStatus.CANCELLED) return null;

        LocalDate anchor = subscription.isTrial() ? subscription.getTrialEndDate() : subscription.getStartDate();
        return nextBillingDate(anchor, subscription.getBillingCycle(), from);
    }

    public static LocalDate nextBillingDate(LocalDate anchor, BillingCycle cycle, LocalDate from) {
        if (!from.isAfter(anchor)) return anchor;

        long cycles = switch (cycle) {
            case WEEKLY -> ChronoUnit.DAYS.between(anchor, from) / 7;
            case MONTHLY -> ChronoUnit.MONTHS.between(YearMonth.from(anchor), YearMonth.from(from));
            case YEARLY -> (long) from.getYear() - anchor.getYear();
        };
        LocalDate candidate = billingDate(anchor, cycle, cycles);
        return candidate.isBefore(from) ? billingDate(anchor, cycle, cycles + 1) : candidate;
    }

    private static LocalDate billingDate(LocalDate anchor, BillingCycle cycle, long cycles) {
        return switch (cycle) {
            case WEEKLY -> anchor.plusWeeks(cycles);
            case MONTHLY -> anchor.plusMonths(cycles);
            case YEARLY -> anchor.plusYears(cycles);
        };
    }
}
