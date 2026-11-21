package com.Cross.backend.subscription.dto;

import com.Cross.backend.subscription.entity.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SubscriptionResponse(UUID id, String name, SubscriptionCategory category, BigDecimal amount,
        BillingCycle billingCycle, LocalDate startDate, boolean isTrial, LocalDate trialEndDate,
        SubscriptionStatus status, String notes, Instant createdAt, Instant updatedAt, Instant cancelledAt,
        LocalDate nextBillingDate) {

    public static SubscriptionResponse from(Subscription subscription, LocalDate nextBillingDate) {
        return new SubscriptionResponse(subscription.getId(), subscription.getName(), subscription.getCategory(),
                subscription.getAmount(), subscription.getBillingCycle(), subscription.getStartDate(),
                subscription.isTrial(), subscription.getTrialEndDate(), subscription.getStatus(),
                subscription.getNotes(), subscription.getCreatedAt(), subscription.getUpdatedAt(),
                subscription.getCancelledAt(), nextBillingDate);
    }
}
