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
