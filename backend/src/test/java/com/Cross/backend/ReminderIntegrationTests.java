package com.Cross.backend;

import java.time.*;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.*;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.*;
import org.springframework.boot.webmvc.test.autoconfigure.*;
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

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS, properties = "cross.jwt.lifetime=30d")
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Testcontainers
@org.junit.jupiter.api.extension.ExtendWith(OutputCaptureExtension.class)
class ReminderIntegrationTests {
    private static final String TRIGGER = "/api/v1/internal/reminders/run";
    private static final String INBOX = "/api/v1/notifications";
    private static final String HEADER = "X-Reminder-Token";
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16");
    @Autowired MockMvc mvc;
    @Autowired JsonMapper json;
    @Autowired JdbcTemplate jdbc;
    @Value("${REMINDER_TRIGGER_TOKEN}") String token;
    @MockitoBean Clock clock;

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @BeforeEach
    void prepare() {
        jdbc.update("delete from users");
        when(clock.withZone(any(ZoneId.class)))
                .thenAnswer(call -> Clock.fixed(clock.instant(), call.getArgument(0)));
        date(LocalDate.of(2024, 2, 24));
    }

    @Test
    void runsDailyAndExposesOwnerScopedInbox() throws Exception {
        String owner = register("reminder-owner@example.com");
        String other = register("reminder-other@example.com");
        LocalDate billing = LocalDate.of(2024, 2, 29);
        String subscription = create(owner, billing, "MONTHLY");
        for (int offset = -5; offset <= 1; offset++) {
            date(billing.plusDays(offset));
            run(offset == -3 || offset == -1 ? 1 : 0);
            if (offset == -3) run(0);
        }

        String page = mvc.perform(get(INBOX).header("Authorization", owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20)).andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.items[0].alertType").value("ONE_DAY"))
                .andExpect(jsonPath("$.items[1].alertType").value("THREE_DAYS"))
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(page).get("items").get(0).get("id").asString();
        String read = INBOX + "/" + id + "/read";
        mvc.perform(post(read).header("Authorization", other)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("notification_not_found"));
        mvc.perform(post(INBOX + "/" + UUID.randomUUID() + "/read").header("Authorization", owner))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("notification_not_found"));
        mvc.perform(get(INBOX).header("Authorization", other)).andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(post(INBOX + "/read-all").header("Authorization", other)).andExpect(jsonPath("$.updated").value(0));
        mvc.perform(get(INBOX + "/unread-count").header("Authorization", owner)).andExpect(jsonPath("$.count").value(2));

        String firstRead = mvc.perform(post(read).header("Authorization", owner)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        date(billing.plusDays(2));
        mvc.perform(post(read).header("Authorization", owner)).andExpect(content().json(firstRead));
        mvc.perform(get(INBOX + "?unreadOnly=true&size=1").header("Authorization", owner))
                .andExpect(jsonPath("$.totalElements").value(1)).andExpect(jsonPath("$.items[0].alertType").value("THREE_DAYS"));
        mvc.perform(get(INBOX + "?unreadOnly=false&size=50&page=3").header("Authorization", owner))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.items").isEmpty());
        for (String query : new String[]{"page=-1", "size=0", "size=51", "page=abc", "unreadOnly=oops"}) {
            mvc.perform(get(INBOX + "?" + query).header("Authorization", owner)).andExpect(status().isBadRequest());
        }
        mvc.perform(post(INBOX + "/read-all").header("Authorization", owner)).andExpect(jsonPath("$.updated").value(1));
        mvc.perform(post(INBOX + "/read-all").header("Authorization", owner)).andExpect(jsonPath("$.updated").value(0));
        mvc.perform(get(INBOX + "/unread-count").header("Authorization", owner)).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get(INBOX)).andExpect(status().isUnauthorized());
        mvc.perform(get(INBOX + "/unread-count")).andExpect(status().isUnauthorized());
        mvc.perform(post(read)).andExpect(status().isUnauthorized());
        mvc.perform(post(INBOX + "/read-all")).andExpect(status().isUnauthorized());
        mvc.perform(delete(subscription).header("Authorization", owner)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isZero();
    }

    @Test
    void catchesUpAndStartsFreshForNextWeeklyCycle() throws Exception {
        String owner = register("weekly@example.com");
        LocalDate billing = LocalDate.of(2024, 2, 29);
        create(owner, billing, "WEEKLY");
        create(owner, billing.minusDays(1), "WEEKLY");
        create(owner, billing.minusDays(2), "WEEKLY");

        date(billing.minusDays(2));
        run(3);
        assertMessage(billing, "THREE_DAYS", "in 2 days");
        assertMessage(billing.minusDays(1), "ONE_DAY", "tomorrow");
        assertMessage(billing.minusDays(2), "ONE_DAY", "today");
        date(billing.minusDays(1));
        run(1);

        date(billing.plusDays(4));
        run(3);
        date(billing.plusDays(6));
        run(2);
        assertThat(jdbc.queryForObject("select count(*) from notifications where billing_date = ?", Long.class,
                billing.plusWeeks(1))).isEqualTo(2);
        mvc.perform(delete("/api/v1/users/me").header("Authorization", owner)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isZero();
    }

    @Test
    void authenticatesOnlyTheTriggerHeader(CapturedOutput output) throws Exception {
        String owner = register("trigger@example.com");
        String wrongToken = "wrong-trigger-fixture";
        String unauthorized = mvc.perform(post(TRIGGER)).andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        mvc.perform(post(TRIGGER).header(HEADER, wrongToken)).andExpect(status().isUnauthorized())
                .andExpect(content().json(unauthorized));
        mvc.perform(post(TRIGGER).header("Authorization", owner)).andExpect(status().isUnauthorized())
                .andExpect(content().json(unauthorized));
        mvc.perform(post(TRIGGER).header(HEADER, token, token)).andExpect(status().isUnauthorized());
        mvc.perform(options(TRIGGER).header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")).andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
        String response = run(0).andReturn().getResponse().getContentAsString();
        assertThat(response + unauthorized + output.getAll()).doesNotContain(token, wrongToken);
    }

    private void assertMessage(LocalDate billing, String alert, String when) {
        assertThat(jdbc.queryForObject("select message from notifications where billing_date = ? and alert_type = ?",
                String.class, billing, alert)).contains(when);
    }

    @Test
    void isolatesFailuresAcrossBatchesAndCleansUpExpiredRows() throws Exception {
        String owner = register("batches@example.com");
        LocalDate today = LocalDate.of(2024, 2, 24);
        create(owner, today, "MONTHLY");
        run(1);
        jdbc.update("""
                INSERT INTO subscriptions (id,user_id,name,category,amount,billing_cycle,start_date,is_trial,
                    status,created_at,updated_at,version)
                SELECT gen_random_uuid(), users.id, 'Seed', 'OTHER', 1, 'MONTHLY', ?, false,
                    'ACTIVE', now(), now(), 0 FROM users CROSS JOIN generate_series(1,201)
                """, today);
        jdbc.update("update subscriptions set name = 'Forced failure' where id = (select id from subscriptions where name = 'Seed' limit 1)");
        jdbc.update("update notifications set created_at = ?", java.sql.Timestamp.from(clock.instant().minus(Duration.ofDays(90))));
        jdbc.execute("alter table notifications add constraint test_failure check (message not like 'Forced failure%')");
        try {
            mvc.perform(post(TRIGGER).header(HEADER, token)).andExpect(status().isOk())
                    .andExpect(jsonPath("$.subscriptionsChecked").value(202))
                    .andExpect(jsonPath("$.notificationsCreated").value(200))
                    .andExpect(jsonPath("$.failures").value(1));
            assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isEqualTo(201);
        } finally {
            jdbc.execute("alter table notifications drop constraint test_failure");
        }
        date(today.plusDays(1));
        run(0);
        assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isEqualTo(200);
    }

    @Test
    void skipsAnOverlappingRunAndUsesKolkataMidnight() throws Exception {
        String owner = register("overlap@example.com");
        create(owner, LocalDate.of(2024, 2, 28), "MONTHLY");
        try (var connection = jdbc.getDataSource().getConnection();
                var statement = connection.prepareStatement("select pg_advisory_xact_lock(?)")) {
            connection.setAutoCommit(false);
            statement.setLong(1, 0x43524F535352454DL);
            statement.execute();
            mvc.perform(post(TRIGGER).header(HEADER, token)).andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("reminder_run_in_progress"));
            connection.rollback();
        }
        when(clock.instant()).thenReturn(Instant.parse("2024-02-24T18:29:59Z"));
        run(0).andExpect(jsonPath("$.runDate").value("2024-02-24"));
        when(clock.instant()).thenReturn(Instant.parse("2024-02-24T18:30:00Z"));
        run(1).andExpect(jsonPath("$.runDate").value("2024-02-25"));
    }

    @Test
    void cleanupFailureDoesNotUndoCreation() throws Exception {
        String owner = register("cleanup@example.com");
        LocalDate today = LocalDate.of(2024, 2, 24);
        create(owner, today, "MONTHLY");
        run(1);
        jdbc.update("update notifications set created_at = ?", java.sql.Timestamp.from(Instant.EPOCH));
        create(owner, today, "MONTHLY");
        jdbc.execute("create function fail_test_cleanup() returns trigger language plpgsql as "
                + "'begin raise exception ''forced cleanup failure''; end;'");
        try {
            jdbc.execute("create trigger fail_test_cleanup before delete on notifications "
                    + "for each row execute function fail_test_cleanup()");
            run(1);
            assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isEqualTo(2);
        } finally {
            jdbc.execute("drop trigger if exists fail_test_cleanup on notifications");
            jdbc.execute("drop function fail_test_cleanup()");
        }
    }

    @Test
    void twoConcurrentTriggersCreateOneNotification() throws Exception {
        String owner = register("concurrent-reminders@example.com");
        create(owner, LocalDate.of(2024, 2, 24), "MONTHLY");
        var executor = Executors.newSingleThreadExecutor();
        try (var connection = jdbc.getDataSource().getConnection();
                var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.execute("select id from subscriptions for update");
            var first = executor.submit(() -> run(1));
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            boolean acquired;
            do {
                acquired = Boolean.TRUE.equals(jdbc.queryForObject(
                        "select exists (select 1 from pg_locks where locktype = 'advisory' and granted)",
                        Boolean.class));
                if (!acquired) Thread.sleep(10);
            } while (!acquired && System.nanoTime() < deadline);
            assertThat(acquired).isTrue();
            mvc.perform(post(TRIGGER).header(HEADER, token)).andExpect(status().isConflict());
            connection.rollback();
            first.get(10, TimeUnit.SECONDS);
            run(0);
            assertThat(jdbc.queryForObject("select count(*) from notifications", Long.class)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    private org.springframework.test.web.servlet.ResultActions run(int created) throws Exception {
        return mvc.perform(post(TRIGGER).header(HEADER, token)).andExpect(status().isOk())
                .andExpect(header().doesNotExist(HEADER)).andExpect(jsonPath("$.failures").value(0))
                .andExpect(jsonPath("$.notificationsCreated").value(created));
    }

    private void date(LocalDate date) {
        when(clock.instant()).thenReturn(date.atTime(2, 30).toInstant(ZoneOffset.UTC));
    }

    private String create(String owner, LocalDate billing, String cycle) throws Exception {
        return mvc.perform(post("/api/v1/subscriptions").header("Authorization", owner).contentType("application/json")
                .content("""
                        {"name":"Music","category":"MUSIC","amount":99.99,"billingCycle":"%s",
                         "startDate":"%s","isTrial":false}
                        """.formatted(cycle, billing))).andExpect(status().isCreated()).andReturn()
                .getResponse().getHeader("Location");
    }

    private String register(String email) throws Exception {
        String credentials = """
                {"email":"%s","password":"password"}
                """.formatted(email);
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials))
                .andExpect(status().isCreated());
        var response = mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials))
                .andExpect(status().isOk()).andReturn().getResponse();
        return "Bearer " + json.readTree(response.getContentAsString()).get("accessToken").asString();
    }
}
