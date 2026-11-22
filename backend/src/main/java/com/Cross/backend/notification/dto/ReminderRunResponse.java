package com.Cross.backend.notification.dto;

public record ReminderRunResponse(java.time.LocalDate runDate, long subscriptionsChecked, long notificationsCreated, long failures) {}
