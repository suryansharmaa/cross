package com.Cross.backend.subscription.dto;

import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.validation.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@ValidTrial
public record UpdateSubscriptionRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull SubscriptionCategory category,
        @NotNull @Positive @DecimalMax("9999999.99") @Digits(integer = 7, fraction = 2) BigDecimal amount,
        @NotNull BillingCycle billingCycle,
        @NotNull LocalDate startDate,
        @NotNull Boolean isTrial,
        LocalDate trialEndDate,
        @Size(max = 500) String notes) implements TrialFields {

    public UpdateSubscriptionRequest {
        if (name != null) name = name.trim();
    }
}
