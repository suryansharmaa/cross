package com.Cross.backend.notification.service;

import com.Cross.backend.notification.entity.*;
import com.Cross.backend.notification.repository.NotificationRepository;
import com.Cross.backend.subscription.entity.SubscriptionStatus;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.subscription.service.BillingDateCalculator;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class ReminderSubscriptionProcessor {
    private final SubscriptionRepository subscriptions;
    private final NotificationRepository notifications;
    private final Clock clock;

    public ReminderSubscriptionProcessor(SubscriptionRepository subscriptions,
            NotificationRepository notifications, Clock clock) {
        this.subscriptions = subscriptions;
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean process(UUID id, LocalDate today) {
        var subscription = subscriptions.findForReminder(id).orElse(null);
        if (subscription == null || subscription.getStatus() != SubscriptionStatus.ACTIVE) return false;

        LocalDate billingDate = BillingDateCalculator.nextBillingDate(subscription, today);
        long days = ChronoUnit.DAYS.between(today, billingDate);
        if (days > 3) return false;

        String when = switch ((int) days) {
            case 0 -> "today";
            case 1 -> "tomorrow";
            default -> "in " + days + " days";
        };
        AlertType alert = days >= 2 ? AlertType.THREE_DAYS : AlertType.ONE_DAY;
        boolean trialEnding = subscription.isTrial() && billingDate.equals(subscription.getTrialEndDate());
        NotificationKind kind = trialEnding ? NotificationKind.TRIAL_ENDING : NotificationKind.RENEWAL;
        String amount = subscription.getAmount().setScale(2).toPlainString();
        String name = subscription.getName();
        String message = trialEnding
                ? "Your %s trial ends %s. You will be charged INR %s unless you cancel.".formatted(name, when, amount)
                : "%s renews %s for INR %s.".formatted(name, when, amount);
        return notifications.insertAlert(UUID.randomUUID(), subscription.getUser().getId(), id,
                billingDate, alert.name(), kind.name(), message, clock.instant()) == 1;
    }
}
