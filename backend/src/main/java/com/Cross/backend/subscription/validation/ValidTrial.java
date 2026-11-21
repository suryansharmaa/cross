package com.Cross.backend.subscription.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = TrialValidator.class)
public @interface ValidTrial {
    String message() default "Trial end date is required for trials, cannot precede the start date, and must be absent for non-trials.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
