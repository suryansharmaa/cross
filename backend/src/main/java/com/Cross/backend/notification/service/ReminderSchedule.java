package com.Cross.backend.notification.service;

import com.Cross.backend.notification.exception.ReminderRunInProgressException;
import org.slf4j.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "cross.reminders", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class ReminderSchedule {
    private static final Logger LOG = LoggerFactory.getLogger(ReminderSchedule.class);
    private final ReminderService reminders;

    public ReminderSchedule(ReminderService reminders) {
        this.reminders = reminders;
    }

    @Scheduled(cron = "0 0 8 * * *", zone = "Asia/Kolkata")
    public void run() {
        try {
            LOG.info("Scheduled reminders completed {}", reminders.run());
        } catch (ReminderRunInProgressException running) {
            LOG.info("Scheduled reminder run skipped because another run is active");
        }
    }
}
