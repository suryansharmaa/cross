package com.Cross.backend.notification.controller;

import com.Cross.backend.notification.dto.*;
import com.Cross.backend.notification.service.NotificationService;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public NotificationPageResponse list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return notifications.list(owner(jwt), unreadOnly,
                PageRequest.of(page, size, Sort.Direction.DESC, "createdAt", "id"));
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return notifications.unreadCount(owner(jwt));
    }

    @PostMapping("/{id}/read")
    public NotificationResponse read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return notifications.read(owner(jwt), id);
    }

    @PostMapping("/read-all")
    public ReadAllResponse readAll(@AuthenticationPrincipal Jwt jwt) {
        return notifications.readAll(owner(jwt));
    }

    private UUID owner(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
