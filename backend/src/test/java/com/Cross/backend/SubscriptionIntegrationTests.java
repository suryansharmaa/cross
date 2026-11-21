package com.Cross.backend;

import com.Cross.backend.subscription.repository.SubscriptionRepository;
import com.Cross.backend.user.repository.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.jdbc.core.JdbcTemplate;
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

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS)
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Testcontainers
class SubscriptionIntegrationTests {
    private static final String PATH = "/api/v1/subscriptions";
    private static final String BODY = """
            {"name":" Music ","category":"MUSIC","amount":99.99,"billingCycle":"MONTHLY",
             "startDate":"2024-01-01","isTrial":false}
            """;
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16");
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired UserRepository users;
    @Autowired SubscriptionRepository subscriptions;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @MockitoBean Clock clock;

    @BeforeEach
    void setUpClock() {
        when(clock.instant()).thenReturn(Instant.parse("2024-02-01T18:29:59Z"));
        when(clock.withZone(any(ZoneId.class)))
                .thenAnswer(call -> Clock.fixed(clock.instant(), call.getArgument(0)));
    }

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    void runsLifecycleAndScopesEveryOperation() throws Exception {
        String owner = register("subscription-owner@example.com");
        String other = register("subscription-other@example.com");
        var ownerId = users.findByEmail("subscription-owner@example.com").orElseThrow().getId();
        var created = mvc.perform(post(PATH).header("Authorization", owner).contentType("application/json")
                .content(BODY)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.nextBillingDate").value("2024-02-01")).andReturn().getResponse();
        String path = created.getHeader("Location");
        create(owner);
        create(other);
        mvc.perform(get(PATH).header("Authorization", other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(PATH + "?size=1&status=ACTIVE").header("Authorization", owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2))
                .andExpect(jsonPath("$.items[0].nextBillingDate").value("2024-02-01"));
        String missing = PATH + "/" + UUID.randomUUID();
        for (String method : List.of("GET", "PUT", "POST", "DELETE")) {
            String expectedDetail = null;
            for (String target : List.of(missing, path)) {
                String uri = method.equals("POST") ? target + "/cancel" : target;
                var request = request(org.springframework.http.HttpMethod.valueOf(method), uri);
                if (method.equals("PUT")) request.contentType("application/json").content(BODY);
                var response = mvc.perform(request.header("Authorization", other)).andExpect(status().isNotFound())
                        .andExpect(jsonPath("$.code").value("subscription_not_found")).andReturn().getResponse();
                String detail = json.readTree(response.getContentAsString()).get("detail").asString();
                if (expectedDetail == null) expectedDetail = detail;
                else assertThat(detail).isEqualTo(expectedDetail);
            }
        }
        mvc.perform(get(path).header("Authorization", owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Music"))
                .andExpect(jsonPath("$.nextBillingDate").value("2024-02-01"));
        when(clock.instant()).thenReturn(Instant.parse("2024-02-01T18:30:00Z"));
        mvc.perform(get(path).header("Authorization", owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nextBillingDate").value("2024-03-01"))
                .andExpect(jsonPath("$.updatedAt").value(json.readTree(created.getContentAsString())
                        .get("updatedAt").asString()));
        mvc.perform(put(path).header("Authorization", owner).contentType("application/json")
                .content(BODY.replace(" Music ", "Updated").replace("2024-01-01", "2024-01-02")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Updated"))
                .andExpect(jsonPath("$.nextBillingDate").value("2024-02-02"));
        String cancelled = mvc.perform(post(path + "/cancel").header("Authorization", owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.nextBillingDate").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.cancelledAt").isNotEmpty()).andReturn().getResponse().getContentAsString();
        mvc.perform(post(path + "/cancel").header("Authorization", owner)).andExpect(content().json(cancelled));
        mvc.perform(put(path).header("Authorization", owner).contentType("application/json").content(BODY))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("subscription_cancelled"));
        mvc.perform(get(PATH + "?status=CANCELLED").header("Authorization", owner))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.items[0].nextBillingDate").value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(get(path).header("Authorization", owner)).andExpect(status().isOk())
                .andExpect(jsonPath("$.nextBillingDate").value(org.hamcrest.Matchers.nullValue()));
        mvc.perform(delete(create(owner)).header("Authorization", owner)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/v1/users/me").header("Authorization", owner)).andExpect(status().isNoContent());
        assertThat(subscriptions.countByUser_Id(ownerId)).isZero();
        mvc.perform(get(PATH).header("Authorization", owner)).andExpect(status().isUnauthorized());
        mvc.perform(get(PATH).header("Authorization", other)).andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get("/actuator/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void serializesCreatesAtTheLimit() throws Exception {
        String email = "subscription-limit@example.com";
        String bearer = register(email);
        UUID owner = users.findByEmail(email).orElseThrow().getId();
        jdbc.update("""
                INSERT INTO subscriptions (id,user_id,name,category,amount,billing_cycle,start_date,is_trial,
                    status,created_at,updated_at,cancelled_at,version)
                SELECT gen_random_uuid(),?,'Seed','OTHER',1,'MONTHLY',DATE '2024-01-01',false,
                    'CANCELLED',now(),now(),now(),0 FROM generate_series(1,99)
                """, owner);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> createResponse(bearer));
            var second = executor.submit(() -> createResponse(bearer));
            var responses = List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));
            assertThat(responses).extracting(response -> response.getStatus()).containsExactlyInAnyOrder(201, 409);
            var rejected = responses.stream().filter(response -> response.getStatus() == 409).findFirst().orElseThrow();
            assertThat(json.readTree(rejected.getContentAsString()).get("code").asString())
                    .isEqualTo("subscription_limit_exceeded");
            assertThat(subscriptions.countByUser_Id(owner)).isEqualTo(100);
            create(register("subscription-under-limit@example.com"));
            var accepted = responses.stream().filter(response -> response.getStatus() == 201).findFirst().orElseThrow();
            mvc.perform(delete(accepted.getHeader("Location")).header("Authorization", bearer))
                    .andExpect(status().isNoContent());
            create(bearer);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void rejectsStaleWritesAndInvalidDatabaseRows() throws Exception {
        String bearer = register("subscription-version@example.com");
        String path = create(bearer);
        UUID id = UUID.fromString(path.substring(PATH.length() + 1));
        var tx = new org.springframework.transaction.support.TransactionTemplate(transactions);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> tx.executeWithoutResult(outer -> {
            var stale = subscriptions.findById(id).orElseThrow();
            var concurrent = new org.springframework.transaction.support.TransactionTemplate(transactions);
            concurrent.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            concurrent.executeWithoutResult(inner -> subscriptions.findById(id).orElseThrow().cancel(java.time.Instant.now()));
            stale.cancel(java.time.Instant.EPOCH);
            subscriptions.flush();
        })).isInstanceOf(org.springframework.dao.OptimisticLockingFailureException.class);

        for (String invalid : List.of("category='INVALID'", "billing_cycle='INVALID'", "status='INVALID'",
                "amount=0", "amount=10000000", "is_trial=true",
                "is_trial=true, trial_end_date=DATE '2023-12-31'", "trial_end_date=DATE '2024-01-01'",
                "user_id=gen_random_uuid()")) {
            org.assertj.core.api.Assertions.assertThatThrownBy(
                    () -> jdbc.update("UPDATE subscriptions SET " + invalid + " WHERE id=?", id))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        }
    }

    @Test
    void ignoresForgedServerManagedFieldsOnCreateAndUpdate() throws Exception {
        String email = "subscription-forgery@example.com";
        String owner = register(email);
        String otherEmail = "subscription-forgery-target@example.com";
        String other = register(otherEmail);
        UUID otherId = users.findByEmail(otherEmail).orElseThrow().getId();
        UUID forgedId = UUID.randomUUID();
        String forgedTime = "2000-01-01T00:00:00Z";
        var payload = json.readTree(BODY).asObject();
        payload.put("userId", otherId.toString());
        payload.put("id", forgedId.toString());
        payload.put("status", "CANCELLED");
        payload.put("createdAt", forgedTime);
        payload.put("updatedAt", forgedTime);
        payload.put("cancelledAt", forgedTime);
        payload.put("version", 4321);
        var creation = mvc.perform(post(PATH).header("Authorization", owner).contentType("application/json")
                .content(json.writeValueAsString(payload))).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ACTIVE")).andReturn().getResponse();
        var created = json.readTree(creation.getContentAsString());
        UUID id = UUID.fromString(created.get("id").asString());
        assertThat(id).isNotEqualTo(forgedId);
        assertThat(created.get("createdAt").asString()).isNotEqualTo(forgedTime);
        assertThat(created.get("updatedAt")).isEqualTo(created.get("createdAt"));
        assertThat(created.get("cancelledAt").isNull()).isTrue();
        String path = creation.getHeader("Location");
        payload.put("name", "Edited");
        var update = mvc.perform(put(path).header("Authorization", owner).contentType("application/json")
                .content(json.writeValueAsString(payload))).andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Edited")).andReturn().getResponse();
        var updated = json.readTree(update.getContentAsString());
        for (String field : List.of("id", "status", "createdAt", "cancelledAt")) {
            assertThat(updated.get(field)).isEqualTo(created.get(field));
        }
        var before = java.time.Instant.parse(created.get("updatedAt").asString());
        var after = java.time.Instant.parse(updated.get("updatedAt").asString());
        assertThat(after).isAfterOrEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT user_id FROM subscriptions WHERE id=?", UUID.class, id))
                .isEqualTo(users.findByEmail(email).orElseThrow().getId());
        assertThat(jdbc.queryForObject("SELECT version FROM subscriptions WHERE id=?", Long.class, id))
                .isEqualTo(1L);
        mvc.perform(get(path).header("Authorization", other)).andExpect(status().isNotFound());
    }

    @Test
    void sortsTiesAndReplacesAllEditableFields() throws Exception {
        String bearer = register("subscription-sort@example.com");
        String first = create(bearer);
        String second = create(bearer);
        UUID firstId = UUID.fromString(first.substring(PATH.length() + 1));
        UUID secondId = UUID.fromString(second.substring(PATH.length() + 1));
        jdbc.update("UPDATE subscriptions SET created_at=? WHERE id IN (?, ?)",
                java.sql.Timestamp.from(java.time.Instant.EPOCH), firstId, secondId);
        String newest = create(bearer);
        String high = firstId.toString().compareTo(secondId.toString()) > 0 ? firstId.toString() : secondId.toString();
        mvc.perform(get(PATH).header("Authorization", bearer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(newest.substring(PATH.length() + 1)))
                .andExpect(jsonPath("$.items[1].id").value(high));
        mvc.perform(get(PATH + "?page=3&size=50").header("Authorization", bearer))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.totalElements").value(3));
        String trial = """
                {"name":"Work","category":"PRODUCTIVITY","amount":50,"billingCycle":"YEARLY",
                 "startDate":"2024-02-29","isTrial":true,"trialEndDate":"2024-02-29","notes":"Trial"}
                """;
        mvc.perform(put(first).header("Authorization", bearer).contentType("application/json").content(trial))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isTrial").value(true))
                .andExpect(jsonPath("$.trialEndDate").value("2024-02-29"));
        mvc.perform(put(first).header("Authorization", bearer).contentType("application/json").content(BODY.replace("\"isTrial\":false", "\"isTrial\":false,\"notes\":null")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Music"))
                .andExpect(jsonPath("$.category").value("MUSIC")).andExpect(jsonPath("$.amount").value(99.99))
                .andExpect(jsonPath("$.billingCycle").value("MONTHLY"))
                .andExpect(jsonPath("$.startDate").value("2024-01-01")).andExpect(jsonPath("$.isTrial").value(false))
                .andExpect(jsonPath("$.trialEndDate").doesNotExist()).andExpect(jsonPath("$.notes").doesNotExist());
    }

    @Test
    void reportsBothSemanticDateBoundsOnCreateAndUpdate() throws Exception {
        String bearer = register("subscription-date@example.com");
        String path = create(bearer);
        for (String date : List.of("1999-12-31", "9999-12-31")) {
            for (var request : List.of(post(PATH), put(path))) {
                mvc.perform(request.header("Authorization", bearer).contentType("application/json")
                        .content(BODY.replace("2024-01-01", date)))
                        .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("validation_failed"))
                        .andExpect(jsonPath("$.fieldErrors[0].field").value("startDate"));
            }
        }
    }

    private String create(String bearer) throws Exception {
        var response = createResponse(bearer);
        assertThat(response.getStatus()).isEqualTo(201);
        return response.getHeader("Location");
    }

    private org.springframework.mock.web.MockHttpServletResponse createResponse(String bearer) throws Exception {
        return mvc.perform(post(PATH).header("Authorization", bearer).contentType("application/json").content(BODY))
                .andReturn().getResponse();
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
