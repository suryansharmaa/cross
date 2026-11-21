package com.Cross.backend.subscription.dto;

import com.Cross.backend.subscription.entity.Subscription;
import org.springframework.data.domain.Page;
import java.util.List;

public record SubscriptionPageResponse(List<SubscriptionResponse> items, int page, int size,
        long totalElements, int totalPages) {

    public static SubscriptionPageResponse from(Page<Subscription> page) {
        return new SubscriptionPageResponse(page.map(SubscriptionResponse::from).getContent(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
