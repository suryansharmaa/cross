package com.Cross.backend;

import com.Cross.backend.user.repository.UserRepository;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Testcontainers
class AccountsIntegrationTests {
    private static final String ME = "/api/v1/users/me";
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16");
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @LocalServerPort int port;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void startsWithFlywayAndRunsAccountLifecycle() throws Exception {
        assertThat(register(" First@Example.com ")).isEqualTo(201);
        assertThat(register("first@example.com")).isEqualTo(409);
        assertThat(register("second@example.com")).isEqualTo(201);
        var first = users.findByEmail("first@example.com").orElseThrow();
        assertThat(passwords.matches("password", first.getPasswordHash())).isTrue();
        String firstBearer = login("first@example.com");
        String secondBearer = login("second@example.com");
        mvc.perform(get(ME).header("Authorization", firstBearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("first@example.com"));
        mvc.perform(delete(ME).header("Authorization", firstBearer)).andExpect(status().isNoContent());
        mvc.perform(get(ME).header("Authorization", firstBearer)).andExpect(status().isUnauthorized());
        mvc.perform(get(ME).header("Authorization", secondBearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("second@example.com"));
        var health = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + "/actuator/health")).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(json.readTree(health.body())).isEqualTo(json.readTree("{\"status\":\"UP\"}"));
        mvc.perform(get("/actuator/env").header("Authorization", secondBearer)).andExpect(status().isForbidden());
    }

    @Test
    void enforcesUniquenessAcrossConcurrentRegistrations() throws Exception {
        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try {
            var first = executor.submit(() -> {
                ready.countDown();
                start.await();
                return register(" Concurrent@Example.com ");
            });
            var second = executor.submit(() -> {
                ready.countDown();
                start.await();
                return register("concurrent@example.com");
            });
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(java.util.List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(201, 409);
        } finally {
            executor.shutdownNow();
        }
    }

    private int register(String email) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials(email)))
                .andReturn().getResponse().getStatus();
    }

    private String login(String email) throws Exception {
        var response = mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials(email)))
                .andExpect(status().isOk()).andReturn().getResponse();
        return "Bearer " + json.readTree(response.getContentAsString()).get("accessToken").asString();
    }

    private String credentials(String email) {
        return json.writeValueAsString(java.util.Map.of("email", email, "password", "password"));
    }
}
