package com.Cross.backend.subscription.service;

import com.Cross.backend.subscription.dto.*;
import com.Cross.backend.subscription.entity.*;
import com.Cross.backend.subscription.exception.*;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.user.entity.User;
import com.Cross.backend.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.data.domain.PageRequest;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SubscriptionServiceTests {
    private final SubscriptionRepository rows = mock(SubscriptionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final Instant now = Instant.parse("2024-02-28T20:00:00Z");
    private final SubscriptionService service = new SubscriptionService(rows, users, Clock.fixed(now, ZoneOffset.UTC));
    private final UUID ownerId = UUID.randomUUID();
    private final UUID id = UUID.randomUUID();
    private final User owner = new User("test@example.com", "unused", now);
    private final LocalDate start = LocalDate.of(2024, 2, 29);

    @Test
    void createsAt99AndRejectsAt100() {
        when(users.findForSubscriptionCreate(ownerId)).thenReturn(Optional.of(owner));
        when(rows.countByUser_Id(ownerId)).thenReturn(99L, 100L);
        when(rows.saveAndFlush(any(Subscription.class))).thenAnswer(call -> call.getArgument(0));
        var created = service.create(ownerId, create(start));
        assertThat(created.status()).isEqualTo(SubscriptionStatus.ACTIVE);
        assertThat(created.createdAt()).isEqualTo(now).isEqualTo(created.updatedAt());
        assertThat(created.cancelledAt()).isNull();
        assertThatThrownBy(() -> service.create(ownerId, create(start)))
                .isInstanceOf(SubscriptionLimitExceededException.class);
        verify(rows).saveAndFlush(any(Subscription.class));
    }

    @Test
    void validatesInclusiveKolkataDateBoundsForCreationAndUpdate() {
        when(users.findForSubscriptionCreate(ownerId)).thenReturn(Optional.of(owner));
        when(rows.saveAndFlush(any(Subscription.class))).thenAnswer(call -> call.getArgument(0));
        when(rows.findByIdAndUser_Id(id, ownerId)).thenReturn(Optional.of(new Subscription(owner, now)));
        for (var date : List.of(LocalDate.of(2000, 1, 1), LocalDate.of(2029, 2, 28))) {
            assertThat(service.create(ownerId, create(date)).startDate()).isEqualTo(date);
            assertThat(service.update(ownerId, id, update(date)).startDate()).isEqualTo(date);
        }
        for (var date : List.of(LocalDate.of(1999, 12, 31), LocalDate.of(2029, 3, 1))) {
            assertThatThrownBy(() -> service.create(ownerId, create(date)))
                    .isInstanceOf(InvalidSubscriptionStartDateException.class);
            assertThatThrownBy(() -> service.update(ownerId, id, update(date)))
                    .isInstanceOf(InvalidSubscriptionStartDateException.class);
        }
    }

    @Test
    void usesTheSameScopedLookupForAllItemOperations() {
        assertThatThrownBy(() -> service.get(ownerId, id)).isInstanceOf(SubscriptionNotFoundException.class);
        assertThatThrownBy(() -> service.update(ownerId, id, update(start))).isInstanceOf(SubscriptionNotFoundException.class);
        assertThatThrownBy(() -> service.cancel(ownerId, id)).isInstanceOf(SubscriptionNotFoundException.class);
        assertThatThrownBy(() -> service.delete(ownerId, id)).isInstanceOf(SubscriptionNotFoundException.class);
        verify(rows, times(4)).findByIdAndUser_Id(id, ownerId);
        verifyNoMoreInteractions(rows);
    }

    @Test
    void cancelsOnlyOnceAndRejectsUpdatesAfterCancellation() {
        var row = new Subscription(owner, now.minusSeconds(1));
        when(rows.findByIdAndUser_Id(id, ownerId)).thenReturn(Optional.of(row));
        var first = service.cancel(ownerId, id);
        assertThat(first.status()).isEqualTo(SubscriptionStatus.CANCELLED);
        assertThat(first.cancelledAt()).isEqualTo(now).isEqualTo(first.updatedAt());
        assertThat(first.nextBillingDate()).isNull();
        assertThat(service.cancel(ownerId, id)).isEqualTo(first);
        assertThat(service.get(ownerId, id).nextBillingDate()).isNull();
        assertThatThrownBy(() -> service.update(ownerId, id, update(start)))
                .isInstanceOf(SubscriptionCancelledException.class);
        verify(rows).flush();
        service.delete(ownerId, id);
        verify(rows).delete(row);
    }

    @Test
    void usesTheFutureStartDateForANonTrial() {
        LocalDate future = start.plusDays(2);
        stubMonthlySubscription(future, null);
        assertThat(service.get(ownerId, id).nextBillingDate()).isEqualTo(future);
    }

    @ParameterizedTest
    @CsvSource({
            "2024-03-02, 2024-03-02",
            "2024-02-29, 2024-02-29",
            "2000-01-30, 2024-02-29"
    })
    void anchorsTrialBillingOnItsEndDate(LocalDate trialEnd, LocalDate expected) {
        stubMonthlySubscription(LocalDate.of(2000, 1, 15), trialEnd);
        assertThat(service.get(ownerId, id).nextBillingDate()).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
            "2024-02-28T18:29:59Z, 2024-02-28",
            "2024-02-28T18:30:00Z, 2024-03-28"
    })
    void usesKolkataMidnightEvenWhenTheClockIsInUtc(Instant instant, LocalDate expected) {
        stubMonthlySubscription(LocalDate.of(2024, 1, 28), null);
        var boundaryService = new SubscriptionService(rows, users, Clock.fixed(instant, ZoneOffset.UTC));
        assertThat(boundaryService.get(ownerId, id).nextBillingDate()).isEqualTo(expected);
    }

    @Test
    void returnsFilteredTotalsForHugePage() {
        when(rows.countByUser_IdAndStatus(ownerId, SubscriptionStatus.CANCELLED)).thenReturn(21L);
        var result = service.list(ownerId, SubscriptionStatus.CANCELLED, PageRequest.of(Integer.MAX_VALUE, 20));
        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isEqualTo(21);
        assertThat(result.totalPages()).isEqualTo(2);
    }

    @Test
    void rejectsCreationIfTheAuthenticatedAccountWasDeleted() {
        assertThatThrownBy(() -> service.create(ownerId, create(start)))
                .isInstanceOf(com.Cross.backend.auth.exception.InvalidCredentialsException.class);
        verifyNoInteractions(rows);
    }

    @Test
    void listsByOwnerWithAndWithoutTheStatusFilter() {
        var page = PageRequest.of(0, 20);
        var empty = org.springframework.data.domain.Page.<Subscription>empty(page);
        when(rows.findByUser_Id(ownerId, page)).thenReturn(empty);
        when(rows.findByUser_IdAndStatus(ownerId, SubscriptionStatus.ACTIVE, page)).thenReturn(empty);
        assertThat(service.list(ownerId, null, page).items()).isEmpty();
        assertThat(service.list(ownerId, SubscriptionStatus.ACTIVE, page).items()).isEmpty();
        verify(rows).findByUser_Id(ownerId, page);
        verify(rows).findByUser_IdAndStatus(ownerId, SubscriptionStatus.ACTIVE, page);
    }

    @Test
    void fullyUpdatesAnActiveTrialAndCanDeleteIt() {
        var row = new Subscription(owner, now.minusSeconds(10));
        row.update("Old", SubscriptionCategory.OTHER, BigDecimal.ONE, BillingCycle.WEEKLY,
                start, true, start.plusDays(1), "Old notes", now.minusSeconds(10));
        when(rows.findByIdAndUser_Id(id, ownerId)).thenReturn(Optional.of(row));
        var updated = service.update(ownerId, id, update(start));
        assertThat(updated.name()).isEqualTo("Updated");
        assertThat(updated.category()).isEqualTo(SubscriptionCategory.MUSIC);
        assertThat(updated.amount()).isEqualByComparingTo(BigDecimal.TEN);
        assertThat(updated.billingCycle()).isEqualTo(BillingCycle.YEARLY);
        assertThat(updated.startDate()).isEqualTo(start);
        assertThat(updated.isTrial()).isFalse();
        assertThat(updated.trialEndDate()).isNull();
        assertThat(updated.notes()).isNull();
        assertThat(updated.createdAt()).isEqualTo(now.minusSeconds(10));
        assertThat(updated.updatedAt()).isEqualTo(now);
        assertThat(updated.status()).isEqualTo(SubscriptionStatus.ACTIVE);
        service.delete(ownerId, id);
        verify(rows).delete(row);
    }

    private void stubMonthlySubscription(LocalDate startDate, LocalDate trialEnd) {
        var row = new Subscription(owner, now);
        row.update("Music", SubscriptionCategory.MUSIC, BigDecimal.ONE, BillingCycle.MONTHLY,
                startDate, trialEnd != null, trialEnd, null, now);
        when(rows.findByIdAndUser_Id(id, ownerId)).thenReturn(Optional.of(row));
    }

    private CreateSubscriptionRequest create(LocalDate date) {
        return new CreateSubscriptionRequest("Music", SubscriptionCategory.MUSIC, BigDecimal.ONE,
                BillingCycle.MONTHLY, date, false, null, null);
    }

    private UpdateSubscriptionRequest update(LocalDate date) {
        return new UpdateSubscriptionRequest("Updated", SubscriptionCategory.MUSIC, BigDecimal.TEN,
                BillingCycle.YEARLY, date, false, null, null);
    }
}
