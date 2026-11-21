package com.Cross.backend.subscription.service;

import com.Cross.backend.subscription.entity.BillingCycle;
import java.time.LocalDate;
import java.time.YearMonth;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import static org.assertj.core.api.Assertions.assertThat;

class BillingDateCalculatorTests {
    @ParameterizedTest
    @CsvSource({
            "MONTHLY, 2023-01-31, 2023-02-01, 2023-02-28",
            "MONTHLY, 2024-01-31, 2024-02-01, 2024-02-29",
            "MONTHLY, 2024-01-31, 2024-03-01, 2024-03-31",
            "MONTHLY, 2024-01-31, 2024-04-01, 2024-04-30",
            "MONTHLY, 2023-01-30, 2023-02-01, 2023-02-28",
            "MONTHLY, 2023-01-30, 2023-03-01, 2023-03-30",
            "MONTHLY, 2023-01-29, 2023-02-01, 2023-02-28",
            "MONTHLY, 2023-01-29, 2023-03-01, 2023-03-29",
            "MONTHLY, 2023-12-31, 2024-01-01, 2024-01-31",
            "YEARLY, 2024-02-29, 2025-02-01, 2025-02-28",
            "YEARLY, 2024-02-29, 2028-02-01, 2028-02-29",
            "YEARLY, 2024-02-29, 2100-02-01, 2100-02-28",
            "YEARLY, 2024-02-29, 2104-02-01, 2104-02-29",
            "WEEKLY, 2024-01-29, 2024-02-01, 2024-02-05",
            "WEEKLY, 2024-12-30, 2024-12-31, 2025-01-06",
            "MONTHLY, 2000-01-31, 2026-11-01, 2026-11-30"
    })
    void calculatesAnchoredDates(BillingCycle cycle, LocalDate anchor, LocalDate from, LocalDate expected) {
        assertThat(BillingDateCalculator.nextBillingDate(anchor, cycle, from)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "WEEKLY, 2024-01-31, 2024-02-07, 2024-02-14",
            "MONTHLY, 2024-01-31, 2024-02-29, 2024-03-31",
            "YEARLY, 2024-02-29, 2025-02-28, 2026-02-28"
    })
    void includesBillingDayAndAdvancesTheFollowingDay(
            BillingCycle cycle, LocalDate anchor, LocalDate billingDay, LocalDate followingBillingDay) {
        assertThat(BillingDateCalculator.nextBillingDate(anchor, cycle, billingDay)).isEqualTo(billingDay);
        assertThat(BillingDateCalculator.nextBillingDate(anchor, cycle, billingDay.plusDays(1)))
                .isEqualTo(followingBillingDay);
    }

    @ParameterizedTest
    @EnumSource(BillingCycle.class)
    void returnsTheAnchorOnOrBeforeTheFirstCharge(BillingCycle cycle) {
        LocalDate anchor = LocalDate.of(2024, 2, 29);
        assertThat(BillingDateCalculator.nextBillingDate(anchor, cycle, anchor.minusDays(1))).isEqualTo(anchor);
        assertThat(BillingDateCalculator.nextBillingDate(anchor, cycle, anchor)).isEqualTo(anchor);
    }

    @ParameterizedTest
    @EnumSource(BillingCycle.class)
    void matchesBruteForceAndSatisfiesBillingDateInvariants(BillingCycle cycle) {
        for (YearMonth month = YearMonth.of(2023, 1); month.getYear() <= 2024; month = month.plusMonths(1)) {
            for (int day = 28; day <= month.lengthOfMonth(); day++) {
                LocalDate anchor = month.atDay(day);
                checkRange(anchor, cycle, anchor.minusDays(7), anchor.plusYears(2));
            }
        }
    }

    @Test
    void matchesBruteForceAndSatisfiesInvariantsAroundCenturyLeapDays() {
        LocalDate anchor = LocalDate.of(2024, 2, 29);
        checkRange(anchor, BillingCycle.YEARLY, LocalDate.of(2100, 2, 1), LocalDate.of(2100, 3, 31));
        checkRange(anchor, BillingCycle.YEARLY, LocalDate.of(2104, 2, 1), LocalDate.of(2104, 3, 31));
    }

    private static void checkRange(LocalDate anchor, BillingCycle cycle, LocalDate start, LocalDate end) {
        for (LocalDate from = start; !from.isAfter(end); from = from.plusDays(1)) {
            long index = bruteForceIndex(anchor, cycle, from);
            LocalDate result = BillingDateCalculator.nextBillingDate(anchor, cycle, from);
            assertThat(result).as("%s from %s anchored on %s", cycle, from, anchor)
                    .isEqualTo(dateAt(anchor, cycle, index)).isAfterOrEqualTo(from);
            if (index > 0) {
                assertThat(dateAt(anchor, cycle, index - 1)).isBefore(from);
            } else {
                assertThat(result).isEqualTo(anchor);
            }
        }
    }

    private static long bruteForceIndex(LocalDate anchor, BillingCycle cycle, LocalDate from) {
        long index = 0;
        while (dateAt(anchor, cycle, index).isBefore(from)) {
            index++;
        }
        return index;
    }

    private static LocalDate dateAt(LocalDate anchor, BillingCycle cycle, long index) {
        return switch (cycle) {
            case WEEKLY -> anchor.plusWeeks(index);
            case MONTHLY -> anchor.plusMonths(index);
            case YEARLY -> anchor.plusYears(index);
        };
    }
}
