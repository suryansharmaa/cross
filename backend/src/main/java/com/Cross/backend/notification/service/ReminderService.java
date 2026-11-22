package com.Cross.backend.notification.service;

import com.Cross.backend.common.BusinessDate;
import com.Cross.backend.notification.dto.ReminderRunResponse;
import com.Cross.backend.notification.exception.ReminderRunInProgressException;
import com.Cross.backend.subscription.repository.SubscriptionRepository;
import java.time.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ReminderService {
    private static final Logger LOG = LoggerFactory.getLogger(ReminderService.class);
    // Database-wide key reserved for the Cross reminder job.
    private static final long LOCK_KEY = 0x43524F535352454DL;
    private static final PageRequest BATCH = PageRequest.of(0, 200);

    private final SubscriptionRepository subscriptions;
    private final ReminderSubscriptionProcessor processor;
    private final NotificationRetentionService retention;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    private final TransactionTemplate lockTransaction;

    public ReminderService(SubscriptionRepository subscriptions, ReminderSubscriptionProcessor processor,
            NotificationRetentionService retention, JdbcTemplate jdbc, Clock clock,
            PlatformTransactionManager transactions) {
        this.subscriptions = subscriptions;
        this.processor = processor;
        this.retention = retention;
        this.jdbc = jdbc;
        this.clock = clock;
        lockTransaction = new TransactionTemplate(transactions);
        lockTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public ReminderRunResponse run() {
        LocalDate today = BusinessDate.today(clock);
        Instant cutoff = clock.instant().minus(Duration.ofDays(90));
        return lockTransaction.execute(status -> {
            if (!Boolean.TRUE.equals(jdbc.queryForObject(
                    "select pg_try_advisory_xact_lock(?)", Boolean.class, LOCK_KEY))) {
                throw new ReminderRunInProgressException();
            }
            return processBatches(today, cutoff);
        });
    }

    private ReminderRunResponse processBatches(LocalDate today, Instant cutoff) {
        long checked = 0;
        long created = 0;
        long failures = 0;
        List<UUID> ids = subscriptions.findReminderIds(BATCH);
        while (!ids.isEmpty()) {
            for (UUID id : ids) {
                checked++;
                try {
                    if (processor.process(id, today)) created++;
                } catch (RuntimeException failure) {
                    failures++;
                    LOG.warn("Reminder processing failed for subscription {}", id);
                }
            }
            if (ids.size() < BATCH.getPageSize()) break;
            ids = subscriptions.findReminderIdsAfter(ids.get(ids.size() - 1), BATCH);
        }
        try {
            retention.cleanUp(cutoff);
        } catch (RuntimeException failure) {
            LOG.warn("Notification retention cleanup failed");
        }
        return new ReminderRunResponse(today, checked, created, failures);
    }
}
