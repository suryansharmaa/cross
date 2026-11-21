package com.Cross.backend.subscription.controller;

import com.Cross.backend.subscription.dto.*;
import com.Cross.backend.subscription.entity.SubscriptionStatus;
import com.Cross.backend.subscription.service.SubscriptionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {
    private final SubscriptionService subscriptions;

    public SubscriptionController(SubscriptionService subscriptions) {
        this.subscriptions = subscriptions;
    }

    @PostMapping
    public ResponseEntity<SubscriptionResponse> create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateSubscriptionRequest request) {
        var response = subscriptions.create(owner(jwt), request);
        return ResponseEntity.created(URI.create("/api/v1/subscriptions/" + response.id())).body(response);
    }

    @GetMapping
    public SubscriptionPageResponse list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(required = false) SubscriptionStatus status) {
        return subscriptions.list(owner(jwt), status,
                PageRequest.of(page, size, Sort.Direction.DESC, "createdAt", "id"));
    }

    @GetMapping("/{id}")
    public SubscriptionResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return subscriptions.get(owner(jwt), id);
    }

    @PutMapping("/{id}")
    public SubscriptionResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody UpdateSubscriptionRequest request) {
        return subscriptions.update(owner(jwt), id, request);
    }

    @PostMapping("/{id}/cancel")
    public SubscriptionResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return subscriptions.cancel(owner(jwt), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        subscriptions.delete(owner(jwt), id);
    }

    private UUID owner(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
