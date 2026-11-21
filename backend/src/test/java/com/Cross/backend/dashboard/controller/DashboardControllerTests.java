package com.Cross.backend.dashboard.controller;

import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.config.JwtConfig;
import com.Cross.backend.config.SecurityConfig;
import com.Cross.backend.dashboard.dto.DashboardResponse;
import com.Cross.backend.dashboard.dto.DashboardResponse.TrialsPendingResponse;
import com.Cross.backend.dashboard.service.DashboardService;
import com.Cross.backend.user.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
@Import({SecurityConfig.class, JwtConfig.class, SecurityProblemHandlers.class})
@ActiveProfiles("test")
class DashboardControllerTests {
    @Autowired MockMvc mvc;
    @MockitoBean UserService users;
    @MockitoBean DashboardService dashboard;

    @Test
    void passesTheJwtSubjectToTheService() throws Exception {
        UUID owner = UUID.randomUUID();
        var zero = new BigDecimal("0.00");
        when(dashboard.get(owner)).thenReturn(new DashboardResponse(LocalDate.of(2026, 11, 22), 0,
                zero, zero, List.of(), new TrialsPendingResponse(0, zero), List.of()));
        mvc.perform(get("/api/v1/dashboard").with(jwt().jwt(token -> token.subject(owner.toString()))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.generatedOn").value("2026-11-22"));
        verify(dashboard, only()).get(owner);
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/v1/dashboard")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("invalid_credentials"));
        verifyNoInteractions(dashboard);
    }
}
