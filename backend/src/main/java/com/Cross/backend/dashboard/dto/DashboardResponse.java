package com.Cross.backend.dashboard.dto;

import com.Cross.backend.subscription.entity.BillingCycle;
import com.Cross.backend.subscription.entity.SubscriptionCategory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(LocalDate generatedOn, int activeCount, BigDecimal monthlySpend,
        BigDecimal yearlySpend, List<CategoryBreakdownResponse> categoryBreakdown,
        TrialsPendingResponse trialsPending, List<UpcomingRenewalResponse> upcomingRenewals) {

    public record CategoryBreakdownResponse(SubscriptionCategory category, int count,
            BigDecimal monthlySpend, BigDecimal yearlySpend) {}

    public record TrialsPendingResponse(int count, BigDecimal monthlyIfConverted) {}

    public record UpcomingRenewalResponse(UUID id, String name, SubscriptionCategory category,
            BigDecimal amount, BillingCycle billingCycle, boolean isTrial, LocalDate nextBillingDate,
            long daysUntil) {}
}
