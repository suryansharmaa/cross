package com.Cross.backend.dashboard.service;

import com.Cross.backend.common.BusinessDate;
import com.Cross.backend.dashboard.dto.DashboardResponse;
import com.Cross.backend.dashboard.dto.DashboardResponse.CategoryBreakdownResponse;
import com.Cross.backend.dashboard.dto.DashboardResponse.TrialsPendingResponse;
import com.Cross.backend.dashboard.dto.DashboardResponse.UpcomingRenewalResponse;
import com.Cross.backend.subscription.entity.Subscription;
import com.Cross.backend.subscription.entity.SubscriptionCategory;
import com.Cross.backend.subscription.entity.SubscriptionStatus;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.subscription.service.BillingDateCalculator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
    private static final BigDecimal MONTHS_PER_YEAR = BigDecimal.valueOf(12);
    private static final Comparator<UpcomingRenewalResponse> RENEWAL_ORDER =
            Comparator.comparing(UpcomingRenewalResponse::nextBillingDate)
                    .thenComparing(UpcomingRenewalResponse::name, String.CASE_INSENSITIVE_ORDER)
                    .thenComparing(UpcomingRenewalResponse::name)
                    .thenComparing(UpcomingRenewalResponse::id);

    private final SubscriptionRepository subscriptions;
    private final Clock clock;

    public DashboardService(SubscriptionRepository subscriptions, Clock clock) {
        this.subscriptions = subscriptions;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public DashboardResponse get(UUID ownerId) {
        LocalDate today = BusinessDate.today(clock);
        LocalDate windowEnd = today.plusDays(30);
        var active = subscriptions.findByUser_IdAndStatus(ownerId, SubscriptionStatus.ACTIVE);
        var paying = new Spend();
        var pending = new Spend();
        var categories = new EnumMap<SubscriptionCategory, Spend>(SubscriptionCategory.class);
        var renewals = new ArrayList<UpcomingRenewalResponse>();

        for (Subscription subscription : active) {
            BigDecimal annual = annualCost(subscription);
            if (subscription.isTrial() && subscription.getTrialEndDate().isAfter(today)) {
                pending.add(annual);
            } else {
                paying.add(annual);
                categories.computeIfAbsent(subscription.getCategory(), category -> new Spend()).add(annual);
            }

            LocalDate next = BillingDateCalculator.nextBillingDate(subscription, today);
            if (!next.isBefore(today) && !next.isAfter(windowEnd)) {
                renewals.add(new UpcomingRenewalResponse(subscription.getId(), subscription.getName(),
                        subscription.getCategory(), subscription.getAmount(), subscription.getBillingCycle(),
                        subscription.isTrial(), next, ChronoUnit.DAYS.between(today, next)));
            }
        }

        var breakdown = categories.entrySet().stream()
                .map(entry -> new CategoryBreakdownResponse(entry.getKey(), entry.getValue().count,
                        monthly(entry.getValue().annual), entry.getValue().annual))
                .sorted(Comparator.comparing(CategoryBreakdownResponse::yearlySpend).reversed()
                        .thenComparing(row -> row.category().name()))
                .toList();
        renewals.sort(RENEWAL_ORDER);
        return new DashboardResponse(today, active.size(), monthly(paying.annual), paying.annual,
                breakdown, new TrialsPendingResponse(pending.count, monthly(pending.annual)),
                java.util.List.copyOf(renewals));
    }

    private static BigDecimal annualCost(Subscription subscription) {
        int multiplier = switch (subscription.getBillingCycle()) {
            case WEEKLY -> 52;
            case MONTHLY -> 12;
            case YEARLY -> 1;
        };
        return subscription.getAmount().multiply(BigDecimal.valueOf(multiplier));
    }

    private static BigDecimal monthly(BigDecimal annual) {
        return annual.divide(MONTHS_PER_YEAR, 2, RoundingMode.HALF_UP);
    }

    private static final class Spend {
        private int count;
        private BigDecimal annual = BigDecimal.ZERO.setScale(2);

        private void add(BigDecimal amount) {
            count++;
            annual = annual.add(amount);
        }
    }
}
