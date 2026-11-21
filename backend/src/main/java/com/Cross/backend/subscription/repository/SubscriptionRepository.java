package com.Cross.backend.subscription.repository;

import com.Cross.backend.subscription.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByIdAndUser_Id(UUID id, UUID ownerId);
    Page<Subscription> findByUser_Id(UUID ownerId, Pageable page);
    Page<Subscription> findByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status, Pageable page);
    List<Subscription> findByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status);
    long countByUser_Id(UUID ownerId);
    long countByUser_IdAndStatus(UUID ownerId, SubscriptionStatus status);
}
