package com.Cross.backend.subscription.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class TrialValidator implements ConstraintValidator<ValidTrial, TrialFields> {
    @Override
    public boolean isValid(TrialFields value, ConstraintValidatorContext context) {
        if (value == null || value.isTrial() == null) return true;
        var end = value.trialEndDate();
        boolean valid = value.isTrial()
                ? end != null && (value.startDate() == null || !end.isBefore(value.startDate()))
                : end == null;
        if (!valid) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(context.getDefaultConstraintMessageTemplate())
                    .addPropertyNode("trialEndDate").addConstraintViolation();
        }
        return valid;
    }
}
