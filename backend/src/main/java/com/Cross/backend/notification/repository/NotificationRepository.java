package com.Cross.backend.notification.repository;

import com.Cross.backend.notification.entity.Notification;
import java.time.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUser_Id(UUID owner, Pageable page);
    Page<Notification> findByUser_IdAndReadAtIsNull(UUID owner, Pageable page);
    long countByUser_IdAndReadAtIsNull(UUID owner);
    Optional<Notification> findByIdAndUser_Id(UUID id, UUID owner);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.user.id = :owner and n.id = :id and n.readAt is null")
    int markRead(UUID owner, UUID id, Instant now);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.user.id = :owner and n.readAt is null")
    int markAllRead(UUID owner, Instant now);

    @Modifying
    @Query("delete from Notification n where n.createdAt < :cutoff")
    int deleteExpired(Instant cutoff);

    @Modifying
    @Query(value = """
            INSERT INTO notifications (id, user_id, subscription_id, billing_date, alert_type, kind, message, created_at)
            VALUES (:id, :owner, :subscription, :billingDate, :alertType, :kind, :message, :createdAt)
            ON CONFLICT ON CONSTRAINT notifications_alert_unique DO NOTHING
            """, nativeQuery = true)
    int insertAlert(UUID id, UUID owner, UUID subscription, LocalDate billingDate,
            String alertType, String kind, String message, Instant createdAt);
}
