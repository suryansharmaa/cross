package com.Cross.backend.common;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;

public final class BusinessDate {
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    private BusinessDate() {}

    public static LocalDate today(Clock clock) {
        return LocalDate.now(clock.withZone(ZONE));
    }
}
