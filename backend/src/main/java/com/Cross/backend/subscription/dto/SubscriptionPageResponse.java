package com.Cross.backend.subscription.dto;

import org.springframework.data.domain.Page;
import java.util.List;

public record SubscriptionPageResponse(List<SubscriptionResponse> items, int page, int size,
        long totalElements, int totalPages) {

    public static SubscriptionPageResponse from(Page<SubscriptionResponse> page) {
        return new SubscriptionPageResponse(page.getContent(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
