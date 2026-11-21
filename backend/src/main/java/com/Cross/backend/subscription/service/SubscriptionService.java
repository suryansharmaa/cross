package com.Cross.backend.subscription.service;

import com.Cross.backend.auth.exception.InvalidCredentialsException;
import com.Cross.backend.subscription.dto.*;
import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.exception.*;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.user.repository.UserRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class SubscriptionService {
    private static final int LIMIT = 100;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kolkata");
    private static final LocalDate MIN_START_DATE = LocalDate.of(2000, 1, 1);

    private final SubscriptionRepository subscriptions;
    private final UserRepository users;
    private final Clock clock;

    public SubscriptionService(SubscriptionRepository subscriptions, UserRepository users, Clock clock) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.clock = clock;
    }

    @Transactional
    public SubscriptionResponse create(UUID ownerId, CreateSubscriptionRequest request) {
        LocalDate today = today();
        validateStartDate(request.startDate(), today);
        var owner = users.findForSubscriptionCreate(ownerId).orElseThrow(InvalidCredentialsException::new);
        if (subscriptions.countByUser_Id(ownerId) >= LIMIT) throw new SubscriptionLimitExceededException();
        Instant now = now();
        var subscription = new Subscription(owner, now);
        subscription.update(request.name(), request.category(), request.amount(), request.billingCycle(),
                request.startDate(), request.isTrial(), request.trialEndDate(), request.notes(), now);
        return toResponse(subscriptions.saveAndFlush(subscription), today);
    }

    public SubscriptionPageResponse list(UUID ownerId, SubscriptionStatus status, Pageable page) {
        if (page.getOffset() >= LIMIT) {
            long count = status == null ? subscriptions.countByUser_Id(ownerId)
                    : subscriptions.countByUser_IdAndStatus(ownerId, status);
            return SubscriptionPageResponse.from(new PageImpl<>(List.of(), page, count));
        }
        LocalDate today = today();
        var results = status == null ? subscriptions.findByUser_Id(ownerId, page)
                : subscriptions.findByUser_IdAndStatus(ownerId, status, page);
        return SubscriptionPageResponse.from(results.map(subscription -> toResponse(subscription, today)));
    }

    public SubscriptionResponse get(UUID ownerId, UUID id) {
        return toResponse(findOwned(ownerId, id), today());
    }

    @Transactional
    public SubscriptionResponse update(UUID ownerId, UUID id, UpdateSubscriptionRequest request) {
        var subscription = findOwned(ownerId, id);
        if (subscription.getStatus() == SubscriptionStatus.CANCELLED) throw new SubscriptionCancelledException();
        LocalDate today = today();
        validateStartDate(request.startDate(), today);
        subscription.update(request.name(), request.category(), request.amount(), request.billingCycle(),
                request.startDate(), request.isTrial(), request.trialEndDate(), request.notes(), now());
        subscriptions.flush();
        return toResponse(subscription, today);
    }

    @Transactional
    public SubscriptionResponse cancel(UUID ownerId, UUID id) {
        var subscription = findOwned(ownerId, id);
        if (subscription.getStatus() == SubscriptionStatus.ACTIVE) {
            subscription.cancel(now());
            subscriptions.flush();
        }
        return toResponse(subscription, today());
    }

    @Transactional
    public void delete(UUID ownerId, UUID id) {
        subscriptions.delete(findOwned(ownerId, id));
        subscriptions.flush();
    }

    private Subscription findOwned(UUID ownerId, UUID id) {
        return subscriptions.findByIdAndUser_Id(id, ownerId).orElseThrow(SubscriptionNotFoundException::new);
    }

    private SubscriptionResponse toResponse(Subscription subscription, LocalDate today) {
        LocalDate nextBillingDate = null;
        if (subscription.getStatus() != SubscriptionStatus.CANCELLED) {
            LocalDate anchor = subscription.isTrial() ? subscription.getTrialEndDate() : subscription.getStartDate();
            nextBillingDate = BillingDateCalculator.nextBillingDate(anchor, subscription.getBillingCycle(), today);
        }
        return SubscriptionResponse.from(subscription, nextBillingDate);
    }

    private void validateStartDate(LocalDate startDate, LocalDate today) {
        if (startDate.isBefore(MIN_START_DATE) || startDate.isAfter(today.plusYears(5))) {
            throw new InvalidSubscriptionStartDateException();
        }
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(BUSINESS_ZONE));
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
