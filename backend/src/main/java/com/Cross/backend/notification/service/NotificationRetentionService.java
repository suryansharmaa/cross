package com.Cross.backend.notification.service;

import com.Cross.backend.notification.repository.NotificationRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class NotificationRetentionService {
    private final NotificationRepository notifications;

    public NotificationRetentionService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cleanUp(Instant cutoff) {
        notifications.deleteExpired(cutoff);
    }
}
