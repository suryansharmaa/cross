package com.Cross.backend.dashboard.controller;

import com.Cross.backend.dashboard.dto.DashboardResponse;
import com.Cross.backend.dashboard.service.DashboardService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    @GetMapping
    public DashboardResponse get(@AuthenticationPrincipal Jwt jwt) {
        return dashboard.get(UUID.fromString(jwt.getSubject()));
    }
}
