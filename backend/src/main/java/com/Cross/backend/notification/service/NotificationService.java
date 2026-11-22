package com.Cross.backend.notification.service;

import com.Cross.backend.notification.dto.*;
import com.Cross.backend.notification.exception.NotificationNotFoundException;
import com.Cross.backend.notification.repository.NotificationRepository;
import java.time.Clock;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final Clock clock;

    public NotificationService(NotificationRepository notifications, Clock clock) {
        this.notifications = notifications;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public NotificationPageResponse list(UUID owner, boolean unreadOnly, Pageable page) {
        var results = unreadOnly ? notifications.findByUser_IdAndReadAtIsNull(owner, page)
                : notifications.findByUser_Id(owner, page);
        return NotificationPageResponse.from(results.map(NotificationResponse::from));
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(UUID owner) {
        return new UnreadCountResponse(notifications.countByUser_IdAndReadAtIsNull(owner));
    }

    @Transactional
    public NotificationResponse read(UUID owner, UUID id) {
        notifications.markRead(owner, id, clock.instant());
        return notifications.findByIdAndUser_Id(id, owner).map(NotificationResponse::from)
                .orElseThrow(NotificationNotFoundException::new);
    }

    @Transactional
    public ReadAllResponse readAll(UUID owner) {
        return new ReadAllResponse(notifications.markAllRead(owner, clock.instant()));
    }
}
