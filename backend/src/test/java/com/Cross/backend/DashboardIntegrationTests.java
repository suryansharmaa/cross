package com.Cross.backend;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Testcontainers
class DashboardIntegrationTests {
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16");
    @LocalServerPort int port;
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @MockitoBean Clock clock;

    @BeforeEach
    void setUpClock() {
        when(clock.instant()).thenReturn(Instant.parse("2026-11-21T18:30:00Z"));
        when(clock.withZone(any(ZoneId.class)))
                .thenAnswer(call -> Clock.fixed(clock.instant(), call.getArgument(0)));
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    private static final String PATH = "/api/v1/dashboard";
    private static final String EMPTY = """
            {"generatedOn":"2026-11-22","activeCount":0,"monthlySpend":0.00,"yearlySpend":0.00,
             "categoryBreakdown":[],"trialsPending":{"count":0,"monthlyIfConverted":0.00},"upcomingRenewals":[]}
            """;

    @Test
    void returnsEntireDashboardFromRealSubscriptionsAndIsolatesAccounts() throws Exception {
        String owner = register("dashboard-owner@example.com");
        String other = register("dashboard-other@example.com");
        dashboard(owner, EMPTY);

        String planner = create(owner, "Planner", "PRODUCTIVITY", "100.00", "WEEKLY", "2026-11-22", null);
        String music = create(owner, "Music", "MUSIC", "50.00", "MONTHLY", "2026-01-01", "2026-10-25");
        String cloud = create(owner, "Cloud Storage", "CLOUD_AND_AI", "120.00", "YEARLY", "2026-11-22", "2026-12-02");
        String expected = """
                {"generatedOn":"2026-11-22","activeCount":3,"monthlySpend":483.33,"yearlySpend":5800.00,
                 "categoryBreakdown":[
                   {"category":"PRODUCTIVITY","count":1,"monthlySpend":433.33,"yearlySpend":5200.00},
                   {"category":"MUSIC","count":1,"monthlySpend":50.00,"yearlySpend":600.00}],
                 "trialsPending":{"count":1,"monthlyIfConverted":10.00},
                 "upcomingRenewals":[
                   {"id":"%s","name":"Planner","category":"PRODUCTIVITY","amount":100.00,"billingCycle":"WEEKLY",
                    "isTrial":false,"nextBillingDate":"2026-11-22","daysUntil":0},
                   {"id":"%s","name":"Music","category":"MUSIC","amount":50.00,"billingCycle":"MONTHLY",
                    "isTrial":true,"nextBillingDate":"2026-11-25","daysUntil":3},
                   {"id":"%s","name":"Cloud Storage","category":"CLOUD_AND_AI","amount":120.00,"billingCycle":"YEARLY",
                    "isTrial":true,"nextBillingDate":"2026-12-02","daysUntil":10}]}
                """.formatted(planner, music, cloud);
        dashboard(owner, expected);
        dashboard(other, EMPTY);

        create(other, "Other account", "OTHER", "24.00", "YEARLY", "2027-01-01", null);
        dashboard(other, """
                {"generatedOn":"2026-11-22","activeCount":1,"monthlySpend":2.00,"yearlySpend":24.00,
                 "categoryBreakdown":[{"category":"OTHER","count":1,"monthlySpend":2.00,"yearlySpend":24.00}],
                 "trialsPending":{"count":0,"monthlyIfConverted":0.00},"upcomingRenewals":[]}
                """);
        dashboard(owner, expected);

        cancel(owner, create(owner, "Cancelled", "SHOPPING", "200.00", "MONTHLY", "2026-11-22", null));
        cancel(owner, create(owner, "Cancelled pending", "SHOPPING", "300.00", "YEARLY", "2026-11-22", "2026-11-23"));
        dashboard(owner, expected);
    }

    @Test
    void startsWithPostgresAndReportsHealthy() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/actuator/health")).build();
        var health = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(health.statusCode()).isEqualTo(200);
        assertThat(json.readTree(health.body()).get("status").asString()).isEqualTo("UP");
    }

    @Test
    void requiresBearerToken() throws Exception {
        mvc.perform(get(PATH)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("invalid_credentials"));
    }

    private void dashboard(String bearer, String expected) throws Exception {
        String response = mvc.perform(get(PATH).header("Authorization", bearer))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(response)).isEqualTo(json.readTree(expected));
        var money = java.util.regex.Pattern.compile(
                "\"(?:amount|monthlySpend|yearlySpend|monthlyIfConverted)\"\\s*:\\s*([0-9]+\\.[0-9]{2})(?=\\s*[,}])");
        assertThat(money.matcher(response).results().count()).isEqualTo(money.matcher(expected).results().count());
    }

    private String create(String bearer, String name, String category, String amount, String cycle,
            String start, String trialEnd) throws Exception {
        String payload = """
                {"name":"%s","category":"%s","amount":%s,"billingCycle":"%s",
                 "startDate":"%s","isTrial":%s,"trialEndDate":%s}
                """.formatted(name, category, amount, cycle, start, trialEnd != null, json.writeValueAsString(trialEnd));
        var response = mvc.perform(post("/api/v1/subscriptions").header("Authorization", bearer)
                        .contentType("application/json").content(payload))
                .andExpect(status().isCreated()).andReturn().getResponse();
        return json.readTree(response.getContentAsString()).get("id").asString();
    }

    private void cancel(String bearer, String id) throws Exception {
        mvc.perform(post("/api/v1/subscriptions/" + id + "/cancel").header("Authorization", bearer))
                .andExpect(status().isOk());
    }

    private String register(String email) throws Exception {
        String credentials = json.writeValueAsString(java.util.Map.of("email", email, "password", "password"));
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials))
                .andExpect(status().isCreated());
        var response = mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials))
                .andExpect(status().isOk()).andReturn().getResponse();
        return "Bearer " + json.readTree(response.getContentAsString()).get("accessToken").asString();
    }
}
