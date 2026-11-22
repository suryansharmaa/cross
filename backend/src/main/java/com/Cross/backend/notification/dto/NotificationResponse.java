package com.Cross.backend.notification.dto;

import com.Cross.backend.notification.entity.*;
import java.time.*;
import java.util.UUID;

public record NotificationResponse(UUID id, UUID subscriptionId, NotificationKind kind, AlertType alertType,
        LocalDate billingDate, String message, Instant createdAt, Instant readAt) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getSubscription().getId(),
                notification.getKind(), notification.getAlertType(), notification.getBillingDate(),
                notification.getMessage(), notification.getCreatedAt(), notification.getReadAt());
    }
}
