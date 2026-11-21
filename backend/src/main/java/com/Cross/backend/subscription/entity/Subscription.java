package com.Cross.backend.subscription.entity;

import com.Cross.backend.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Getter
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @Column(length = 100, nullable = false)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(length = 16, nullable = false)
    private SubscriptionCategory category;
    @Column(precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    @Column(length = 7, nullable = false)
    private BillingCycle billingCycle;
    private LocalDate startDate;
    private boolean isTrial;
    private LocalDate trialEndDate;
    @Enumerated(EnumType.STRING)
    @Column(length = 9, nullable = false)
    private SubscriptionStatus status;
    @Column(length = 500)
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant cancelledAt;
    @Version
    private long version;

    protected Subscription() {}

    public Subscription(User user, Instant now) {
        this.user = user;
        this.createdAt = now;
        this.status = SubscriptionStatus.ACTIVE;
    }

    public void update(String name, SubscriptionCategory category, BigDecimal amount,
            BillingCycle billingCycle, LocalDate startDate, boolean trial, LocalDate trialEndDate,
            String notes, Instant now) {
        this.name = name;
        this.category = category;
        this.amount = amount.setScale(2);
        this.billingCycle = billingCycle;
        this.startDate = startDate;
        this.isTrial = trial;
        this.trialEndDate = trialEndDate;
        this.notes = notes;
        this.updatedAt = now;
    }

    public void cancel(Instant now) {
        status = SubscriptionStatus.CANCELLED;
        cancelledAt = now;
        updatedAt = now;
    }
}
