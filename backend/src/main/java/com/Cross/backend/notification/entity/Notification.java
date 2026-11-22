package com.Cross.backend.notification.entity;

import com.Cross.backend.subscription.entity.Subscription;
import com.Cross.backend.user.entity.User;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
import lombok.Getter;

@Entity
@Table(name = "notifications")
@Getter
public class Notification {
    @Id
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;
    private LocalDate billingDate;
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private AlertType alertType;
    @Enumerated(EnumType.STRING)
    @Column(length = 12)
    private NotificationKind kind;
    @Column(length = 300)
    private String message;
    private Instant createdAt;
    private Instant readAt;

    protected Notification() {}
}
