package com.Cross.backend.subscription.validation;

import java.time.LocalDate;

public interface TrialFields {
    Boolean isTrial();
    LocalDate startDate();
    LocalDate trialEndDate();
}
