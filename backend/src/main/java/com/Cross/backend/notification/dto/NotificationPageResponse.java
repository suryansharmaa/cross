package com.Cross.backend.notification.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record NotificationPageResponse(List<NotificationResponse> items, int page, int size,
        long totalElements, int totalPages) {
    public static NotificationPageResponse from(Page<NotificationResponse> page) {
        return new NotificationPageResponse(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
