## Code style and best practices
Write idiomatic, current Spring Boot code (Spring Boot 4.x, Java 17). Prefer the framework's built-in mechanisms over custom ones. Look at existing code in this repo first and stay consistent with it. Do not introduce a second way of doing something.

### Structure
- Package by feature under `com.Cross.backend` (keep this casing): for example `auth`, `subscription`, `notification`, `common`, `config`. Inside a feature: controller, service, repository, entity, dto, and exception classes.
- Layering: controller -> service -> repository. Controllers handle HTTP only. Business logic lives in services. Repositories handle data access only.

### Controllers
- `@RestController`, `@RequestMapping("/api/v1/...")`, verb-specific annotations.
- Return DTOs, never entities. POST returns `201` with a `Location` header (`ResponseEntity.created(uri).body(...)`). DELETE returns `204`. Other responses may return the DTO directly with the correct status.
- `@Valid` on request bodies. Pagination uses `Pageable` and returns `Page` or a page DTO.
- The current user comes from the authenticated principal (`@AuthenticationPrincipal` or `Authentication`), never from a route, query, or body.

### Services
- Constructor injection with `final` fields (a single constructor needs no `@Autowired`). Never field injection.
- Concrete service classes. Add an interface only when there are multiple implementations. The notification sender is one such case.
- `@Transactional` on service methods: `readOnly = true` for reads, and a plain `@Transactional` for writes. Keep transactions short, and never call external systems (email) inside one.
- Inject `java.time.Clock` anywhere the current date or time is used, so date logic can be tested with a fixed clock.
- Look up user-owned resources by id and owner together. Another user's resource behaves as not found (404).

### Entities
- Jakarta Persistence annotations. Lombok `@Getter` and `@Setter` are fine, but never `@Data`. Implement `equals` and `hashCode` on the id only, if needed, and never put relationships in `toString`.
- UUID primary keys (`GenerationType.UUID`). Lazy relationships. Money is `BigDecimal`. Use `LocalDate` and `Instant` for dates and timestamps, and enums stored as strings (`@Enumerated(EnumType.STRING)`).
- Add `@Version` for optimistic locking on entities that users can edit.
- The schema comes only from Flyway migrations, and `ddl-auto` is `validate`. Add indexes for the columns you query (user id, next billing date) and unique constraints for business rules (for example the notification log).
- Set `spring.jpa.open-in-view=false`.

### DTOs and mapping
- Use Java records for request and response DTOs. Name them `CreateXRequest`, `UpdateXRequest`, `XResponse`.
- Bean Validation with clear messages on every request field: `@NotBlank` and `@Size(max = ...)` on strings, `@Positive` on amounts, `@NotNull` where required, and enums for fixed choices.
- Request DTOs never contain ids, owners, or server-managed fields. Responses never include password hashes, tokens, or other users' data.
- Map by hand through a small mapper class or static factory methods. No reflection-based mapping libraries.

### Error handling
- Throw custom runtime exceptions from the service layer (for example `ResourceNotFoundException`, `ConflictException`). Never use `ResponseStatusException` inside services.
- One `@RestControllerAdvice` returns RFC 9457 `ProblemDetail` responses for all errors, with a stable `code` property for the frontend. Include field errors for validation failures.
- Handle validation errors, malformed JSON, type mismatches, unsupported methods and media types, and database constraint violations. The catch-all returns a generic 500 and logs the real exception server-side. Never expose stack traces, SQL, or constraint names.
- 401 and 403 from Spring Security use the same `ProblemDetail` format (custom `AuthenticationEntryPoint` and `AccessDeniedHandler`).

### Security
- Define a `SecurityFilterChain` bean (no `WebSecurityConfigurerAdapter`). Stateless sessions, CSRF disabled for the token-based API, and every endpoint authenticated except register, login, and the health check.
- `BCryptPasswordEncoder` for passwords. Login returns the same 401 for an unknown email and a wrong password. Normalize emails (trim and lower-case) before storing or comparing.
- JWT with a short expiry, signed with a secret from configuration. Validate signature, expiry, and subject on every request.
- CORS allows only the configured frontend origin. Expose only the health actuator endpoint, with no details.
- Secrets come from environment variables. Typed configuration uses `@ConfigurationProperties` records, not scattered `@Value`.
- Never log passwords, tokens, or personal data. Use SLF4J, never `System.out`.

### Scheduling and reliability
- Scheduled and triggered jobs are idempotent. Use database unique constraints to enforce "send once". Job failures for one item must not stop the rest, and each failure is logged with the item's id.

### Testing
- JUnit Jupiter plus AssertJ. Unit tests for services use Mockito. Controller tests use `@WebMvcTest` with MockMvc. Repository and integration tests use Testcontainers with PostgreSQL (not H2), so tests run against the real database engine.
- Cover every service and endpoint, including validation failures, the unauthorized case, and "another user's resource returns 404". Date logic tests use a fixed `Clock` and cover month-end and leap years.
- Name test classes `*Tests` and test methods by behavior (for example `returnsNotFoundForOtherUsersSubscription`).
## Subscriptions

All subscription operations use the authenticated account. Another account's
subscription returns the same 404 as a missing subscription.

- Categories are fixed: ENTERTAINMENT, MUSIC, PRODUCTIVITY, CLOUD_AND_AI,
  EDUCATION, UTILITIES, SHOPPING, and OTHER.
- Billing cycles are WEEKLY, MONTHLY, and YEARLY. Amounts are INR and must be
  positive, at most 9,999,999.99, with no more than two fractional digits.
- A trial must have a trial end date on or after its start date. A non-trial
  must have a null trial end date. Start dates range from 2000-01-01 through
  five years after today in Asia/Kolkata, inclusive.
- Each account can have up to 100 subscriptions, including cancelled ones.
  Creation at the limit returns 409.
- New subscriptions are ACTIVE. Cancelled subscriptions can be read, deleted,
  or cancelled again without changing their timestamps. PUT on a cancelled
  subscription returns 409.
- PUT replaces all editable fields: name, category, amount, billing cycle,
  start date, trial flag, trial end date, and notes. Omitted optional fields
  are cleared. The server controls identity, ownership, status, and timestamps.
- Every subscription response includes a computed `nextBillingDate`. Cancelled
  subscriptions return `null`. The field is never stored.
- Billing starts on `startDate` for a non-trial and on `trialEndDate` for a
  trial. That anchor is the first charge date, and subsequent charges are
  whole weekly, monthly, or yearly cycles from the same anchor.
- The next billing date is the earliest charge date on or after today in
  Asia/Kolkata, including today. If the anchor is in the future, it is the next
  billing date.
- Short months use the last day when the original day is unavailable. Later
  months return to the original day when it exists. Yearly billing anchored
  on February 29 uses February 28 in non-leap years and February 29 in leap years.

## Dashboard

`GET /api/v1/dashboard` returns the authenticated account's dashboard. The
owner UUID comes from the JWT subject. A request without a token receives 401.

- The dashboard captures today's date once from the shared Clock in Asia/Kolkata
  and returns it as `generatedOn`. Only ACTIVE subscriptions contribute to
  `activeCount` or any other dashboard metric.
- Active non-trials and trials ending today or earlier count as paying.
  Trials ending after today are pending. `trialsPending` returns their
  `count` and `monthlyIfConverted`.
- Annualize each amount using 52 for WEEKLY, 12 for MONTHLY, and 1 for YEARLY.
  Sum exact decimals for paying `yearlySpend`. Calculate `monthlySpend` and
  `monthlyIfConverted` by dividing their respective annual totals by 12,
  rounding once to two decimals with HALF_UP.
- `categoryBreakdown` contains one entry per paying category with `category`,
  `count`, `monthlySpend`, and `yearlySpend`, using the same annualization
  and rounding within each category. Sort by annual spend descending and
  category name ascending on ties.
- `upcomingRenewals` includes each active subscription once when its computed
  next billing date falls between today and today plus 30 days inclusive.
  Fields are `id`, `name`, `category`, `amount`, `billingCycle`, `isTrial`,
  `nextBillingDate`, and calendar `daysUntil`. Sort ascending by date,
  case-insensitive name (Java String.CASE_INSENSITIVE_ORDER), case-sensitive
  name, then UUID.
- Dates use ISO YYYY-MM-DD. Money is serialized as JSON numbers with two
  decimal places and INR implied. An empty account receives 200 with today's
  date, zero counts, 0.00 monetary fields, and empty arrays.
- One owner-scoped ACTIVE subscription query feeds in-memory aggregation in a
  read-only transaction. Dashboard data is computed on demand.


## Reminders (5a)

- Each run captures one Asia/Kolkata date. For each ACTIVE subscription, the
  billing calculator supplies the next billing date, including today. At three
  or two days before billing create a THREE_DAYS alert. At one day before
  billing or on the billing date create a ONE_DAY alert. Each window allows
  one day of catch-up. A run at one day before billing creates only ONE_DAY
  even if the earlier window was missed. There is at most one alert per
  subscription per run.
- CANCELLED subscriptions do not alert. A trial's first charge is TRIAL_ENDING.
  Later charges and ordinary subscriptions use RENEWAL. Messages give the
  actual time remaining and the amount in INR. Messages are plain text
  containing user-supplied names. Clients must escape them for their rendering
  context and render them as text.
- PostgreSQL enforces uniqueness by subscription, billing date, and alert type.
  Runs process stable batches of 200 and isolate failures per subscription.
  After processing, delete notifications strictly older than 90 days.
  Cleanup failure does not fail the run.
- The scheduler runs daily at 08:00 Asia/Kolkata. Set
  `cross.reminders.scheduler-enabled=false` to disable it. For GitHub Actions,
  use cron `30 2 * * *` and POST to `/api/v1/internal/reminders/run`.
  Set `REMINDER_TRIGGER_TOKEN` on the backend and store the same value as an
  Actions secret. Send it as `X-Reminder-Token`. An absent variable disables
  the trigger with 404. A configured value needs at least 32 UTF-8 bytes.
  Missing or invalid credentials return 401. The trigger accepts no CORS
  access or JWT credentials.
- The trigger returns 200 with `runDate`, `subscriptionsChecked`,
  `notificationsCreated`, and `failures`. An overlapping run returns 409
  with code `reminder_run_in_progress`.
- `GET /api/v1/notifications` requires a JWT and returns the owner's rows.
  It supports `page` (default 0), `size` (default 20, maximum 50), and
  `unreadOnly` (default false). It uses the subscription page format and sorts
  by creation timestamp and ID, both descending. Items expose `id`,
  `subscriptionId`, `kind`, `alertType`, `billingDate`, `message`,
  `createdAt`, and nullable `readAt`.
- `GET /api/v1/notifications/unread-count` returns `{"count": n}`.
  `POST /api/v1/notifications/{id}/read` returns the notification and
  preserves the first read time. Another owner's ID returns 404.
  `POST /api/v1/notifications/read-all` returns `{"updated": n}`.
  All use the JWT owner. Account and subscription deletions cascade.

## Reminder email (5b)

Email delivery will be added separately and tracked per notification and channel.
