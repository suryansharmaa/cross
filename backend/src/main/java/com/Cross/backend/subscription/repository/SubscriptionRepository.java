package com.Cross.backend.subscription.repository;

import com.Cross.backend.subscription.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    @Query(value = "select id from subscriptions where status = 'ACTIVE' order by id", nativeQuery = true)
    List<UUID> findReminderIds(Pageable page);

    @Query(value = "select id from subscriptions where status = 'ACTIVE' and id > :after order by id",
            nativeQuery = true)
    List<UUID> findReminderIdsAfter(UUID after, Pageable page);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Subscription s where s.id = :id")
    Optional<Subscription> findForReminder(UUID id);

    Optional<Subscription> findByIdAndUser_Id(UUID id, UUID ownerId);
    Page<Subscription> findByUser_Id(UUID ownerId, Pageable page);
    Page<Subscription> findByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status, Pageable page);
    List<Subscription> findByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status);
    long countByUser_Id(UUID ownerId);
    long countByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status);
}
