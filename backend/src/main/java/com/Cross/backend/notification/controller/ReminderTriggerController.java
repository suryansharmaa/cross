package com.Cross.backend.notification.controller;

import com.Cross.backend.notification.dto.ReminderRunResponse;
import com.Cross.backend.notification.service.ReminderService;
import org.springframework.web.bind.annotation.*;

@RestController
public class ReminderTriggerController {
    public static final String PATH = "/api/v1/internal/reminders/run";
    private final ReminderService reminders;

    public ReminderTriggerController(ReminderService reminders) {
        this.reminders = reminders;
    }

    @PostMapping(PATH)
    public ReminderRunResponse run() {
        return reminders.run();
    }
}
