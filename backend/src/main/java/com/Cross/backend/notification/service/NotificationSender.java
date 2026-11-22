package com.Cross.backend.notification.service;

import com.Cross.backend.notification.dto.NotificationResponse;

/** Delivers a committed notification using a stable, channel-specific idempotency key. */
public interface NotificationSender {
    void send(NotificationResponse notification, String deliveryKey);
}
