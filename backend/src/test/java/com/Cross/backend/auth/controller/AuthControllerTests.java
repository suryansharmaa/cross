package com.Cross.backend.auth.controller;

import com.Cross.backend.auth.dto.*;
import com.Cross.backend.auth.exception.*;
import com.Cross.backend.auth.service.AuthService;
import com.Cross.backend.common.SecurityProblemHandlers;
import com.Cross.backend.config.*;
import com.Cross.backend.user.dto.UserResponse;
import com.Cross.backend.user.service.UserService;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtConfig.class, SecurityProblemHandlers.class})
@ActiveProfiles("test")
class AuthControllerTests {
    private static final String BODY = """
            {"email":" USER@example.com ","password":"password"}
            """;
    @Autowired MockMvc mvc;
    @MockitoBean AuthService auth;
    @MockitoBean UserService users;

    @Test
    void registersAndReportsDuplicate() throws Exception {
        when(auth.register(any())).thenReturn(new UserResponse(UUID.randomUUID(), "user@example.com", Instant.EPOCH))
                .thenThrow(new DuplicateEmailException());
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(BODY))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/v1/users/me"))
                .andExpect(jsonPath("$.email").value("user@example.com")).andExpect(jsonPath("$.accessToken").doesNotExist());
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("duplicate_email"));
    }

    @Test
    void returnsTokenOrGenericCredentialsError() throws Exception {
        when(auth.login(any())).thenReturn(new LoginResponse("test-token", Instant.EPOCH))
                .thenThrow(new InvalidCredentialsException());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(BODY))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.accessToken").value("test-token")).andExpect(jsonPath("$.expiresAt").exists());
        for (String body : new String[] {BODY, BODY.replace("USER", "UNKNOWN")}) {
            mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(body))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("invalid_credentials"))
                    .andExpect(jsonPath("$.detail").value("Authentication failed."));
        }
    }

    @Test
    void validatesFieldsAndRequestFormat() throws Exception {
        for (String body : new String[] {"{}", BODY.replace("USER@example.com", "invalid"),
                BODY.replace("password\"}", "é".repeat(37) + "\"}")}) {
            mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors[0].field").exists());
        }
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("invalid_request"));
        mvc.perform(post("/api/v1/auth/register").contentType("text/plain").content(BODY))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void validatesPasswordBoundariesForRegisterAndLogin() throws Exception {
        when(auth.register(any()))
                .thenReturn(new UserResponse(UUID.randomUUID(), "user@example.com", Instant.EPOCH));
        when(auth.login(any())).thenReturn(new LoginResponse("test-token", Instant.EPOCH));

        String register = "/api/v1/auth/register";
        String login = "/api/v1/auth/login";
        String multibyteLimit = "\u00e9".repeat(36);
        for (String password : new String[] {multibyteLimit, "a".repeat(72), "a".repeat(8)}) {
            String body = BODY.replace("\"password\"}", "\"" + password + "\"}");
            mvc.perform(post(register).contentType("application/json").content(body))
                    .andExpect(status().isCreated());
            mvc.perform(post(login).contentType("application/json").content(body))
                    .andExpect(status().isOk());
        }

        for (String path : new String[] {register, login}) {
            for (String password : new String[] {multibyteLimit + "a", "a".repeat(7)}) {
                String body = BODY.replace("\"password\"}", "\"" + password + "\"}");
                mvc.perform(post(path).contentType("application/json").content(body))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
            }
        }
    }

    @Test
    void allowsOnlyTheConfiguredCorsOrigin() throws Exception {
        mvc.perform(options("/api/v1/auth/register").header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(options("/api/v1/auth/register").header("Origin", "https://other.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("access_denied"));
    }
}
