# Repository Guidelines

## Project
"Cross" is a free-trial and subscription tracker: users log trials and subscriptions, see spend, and get reminders before a trial converts to a paid plan. Backend in `backend/` (Spring Boot 4.x, Java 17, Maven, PostgreSQL 16, Flyway, Spring Security with JWT). Frontend in `frontend/` (Vite, React, TypeScript). The feature list and acceptance criteria are in `docs/SPEC.md`. Scale: at most about 50 users, free-tier hosting.

## Structure
- `backend/` Spring Boot module. Base package `com.Cross.backend` (keep this casing).
- `frontend/` React + TypeScript app (Vite). Its rules are in the "Frontend" section below.
- `docker-compose.yml` PostgreSQL 16 for local dev (host port 5434, database and user `cross`).
- Config: `backend/src/main/resources/application.properties`. Schema changes go in Flyway migrations under `backend/src/main/resources/db/migration`.
- `docs/SPEC.md` is the source of truth for features. `docs/DECISIONS.md` records design decisions.

## Run, build, test
- Start DB from repo root: `docker compose up -d db`.
- Backend environment variables (set in the shell or run configuration, never committed): `DB_PASSWORD`, `JWT_SECRET` (required, at least 32 UTF-8 bytes), `REMINDER_TRIGGER_TOKEN` (optional; if set it must be at least 32 bytes, if unset the trigger endpoint is disabled). Tests use their own fake values and disable the scheduler.
- From `backend/`: `.\mvnw.cmd spring-boot:run`, `.\mvnw.cmd test`, `.\mvnw.cmd clean verify` (use `./mvnw` outside PowerShell). Tests need Docker running (Testcontainers).
- From `frontend/`: `npm run dev`, `npm run lint`, `npm test`, `npm run build`.
- The JVM timezone must be `Asia/Kolkata`, because the legacy name `Asia/Calcutta` is rejected by PostgreSQL. `BackendApplication.main` sets it; keep that.

## Backend architecture rules
- Layering: controller -> service -> repository. No business logic in controllers, no entities returned from controllers.
- Every endpoint that returns user data is scoped to the authenticated user. Never trust a user id from the request.
- Schema changes only through new Flyway migrations. Never edit an applied migration. Keep `spring.jpa.hibernate.ddl-auto=validate`.
- This project uses recent Spring Boot and Spring Security versions. Check the dependencies in `pom.xml` and the actual APIs available; do not assume older APIs.

## Backend code style and best practices
Write idiomatic, current Spring Boot code (Spring Boot 4.x, Java 17). Prefer the framework's built-in mechanisms over custom ones. Look at existing code in this repo first and stay consistent with it. Do not introduce a second way of doing something.

### Structure
- Package by feature under `com.Cross.backend`: for example `auth`, `user`, `subscription`, `dashboard`, `notification`, `common`, `config`. Inside a feature: controller, service, repository, entity, dto, and exception classes.

### Controllers
- `@RestController`, `@RequestMapping("/api/v1/...")`, verb-specific annotations.
- Return DTOs, never entities. POST returns `201` with a `Location` header. DELETE returns `204`.
- `@Valid` on request bodies. Pagination uses explicit validated `page` and `size` parameters with a maximum size.
- The current user comes from the authenticated principal, never from a route, query, or body.

### Services
- Constructor injection with `final` fields. Never field injection.
- Concrete service classes. Add an interface only when there are multiple implementations.
- `@Transactional` on service methods: `readOnly = true` for reads. Keep transactions short, and never call external systems (email) inside one.
- Inject `java.time.Clock` anywhere the current date or time is used, so date logic can be tested with a fixed clock. The business date is computed in Asia/Kolkata.
- Look up user-owned resources by id and owner together. Another user's resource behaves as not found (404).

### Entities
- Jakarta Persistence annotations. Lombok `@Getter` and `@Setter` are fine, but never `@Data`. Never put relationships in `toString`.
- UUID primary keys. Lazy relationships. Money is `BigDecimal`. Use `LocalDate` and `Instant`. Enums are stored as strings.
- `@Version` for optimistic locking on entities that users can edit.
- Add indexes for the columns you query and unique constraints for business rules.
- Set `spring.jpa.open-in-view=false`.

### DTOs and mapping
- Java records for request and response DTOs, named `CreateXRequest`, `UpdateXRequest`, `XResponse`.
- Bean Validation with clear messages on every request field: `@NotBlank` and `@Size(max = ...)` on strings, `@Positive` on amounts, `@NotNull` where required, enums for fixed choices.
- Request DTOs never contain ids, owners, or server-managed fields. Responses never include password hashes, tokens (except the login response), or other users' data.
- Map by hand through static factory methods or a small mapper class. No reflection-based mapping libraries.

### Error handling
- Throw custom runtime exceptions from the service layer. Never use `ResponseStatusException` inside services.
- One `@RestControllerAdvice` returns RFC 9457 `ProblemDetail` responses for all errors, with a stable `code` property. Include field errors for validation failures.
- The catch-all returns a generic 500 and logs the real exception server-side. Never expose stack traces, SQL, or constraint names.
- 401 and 403 from Spring Security use the same `ProblemDetail` format.

### Security
- `SecurityFilterChain` bean. Stateless sessions, CSRF disabled for the token-based API, every endpoint authenticated except register, login, and the health check.
- BCrypt for passwords. Login returns the same 401 for an unknown email and a wrong password. Normalize emails (trim and lower-case).
- JWT with a short expiry, signed with a secret from configuration. Validate signature, expiry, and subject on every request.
- CORS allows only the configured frontend origin. Expose only the health actuator endpoint, with no details.
- Secrets come from environment variables. Typed configuration uses `@ConfigurationProperties`.
- Never log passwords, tokens, or personal data. Use SLF4J, never `System.out`.

### Scheduling and reliability
- Scheduled and triggered jobs are idempotent. Use database unique constraints to enforce "send once". A failure for one item must not stop the rest, and each failure is logged with the item's id only.

## Backend testing
- JUnit Jupiter plus AssertJ, test classes named `*Tests`, mirroring the main package tree. Unit tests for services use Mockito. Controller tests use `@WebMvcTest` with MockMvc. Integration tests use Testcontainers with PostgreSQL (not H2).
- Every service and endpoint is covered, including validation failures, the unauthorized case, and "another user's resource returns 404". Date logic tests use a fixed `Clock` and cover month-end and leap years.

## Frontend (frontend/)
Stack: Vite, React (function components and hooks), TypeScript in strict mode. Use current stable versions. Do not add a dependency without saying why.

### Structure
- `src/api/` (the one fetch wrapper, API types, one file per resource), `src/features/<feature>/` (pages, components, hooks), `src/components/` (shared UI), `src/lib/` (formatting and helpers), `src/styles/` (design tokens and global styles).
- One component per file. Small, focused components. No class components.

### TypeScript
- `strict` stays on. No `any`, no `@ts-ignore`, and no non-null `!` assertions to silence errors.
- Keep types simple: interfaces and unions, generics only when they clearly help. API response types live in one place and match the backend DTOs exactly.
- Where a type construct is not obvious, add a one-line `//` comment explaining it.

### State and data
- Server data uses TanStack Query. Local UI state uses `useState` or `useReducer`. No Redux or global stores.
- Every data view handles loading, empty, and error states.

### API layer
- One `fetch` wrapper. The base URL comes from `VITE_API_BASE_URL`. Nothing in a `VITE_` variable is secret, because it is public in the built bundle.
- Parse `application/problem+json` into a typed `ApiError` with `status`, `code`, `detail`, and `fieldErrors`. Show `fieldErrors` next to the matching form fields.
- On 401, clear the session and redirect to login with a short message. Never retry 401 automatically.
- Never log tokens or personal data. Never put tokens in URLs.

### Auth and security
- One auth module owns the token: it keeps the JWT in `sessionStorage`, checks expiry before use, and clears it on logout. Protected routes go through one `RequireAuth` component.
- Never use `dangerouslySetInnerHTML`, `eval`, or `innerHTML`. Render notification messages and user-supplied names as plain text.
- Client-side validation is for convenience only. The server decides.

### Forms and UX
- Disable submit while a request is pending. Show server errors clearly.
- Semantic HTML, labelled inputs, keyboard focus, `aria-live` for error messages. Mobile-first and responsive.
- Money is shown as INR with `Intl.NumberFormat("en-IN")`. Backend date-only strings (`YYYY-MM-DD`) are calendar dates. Never convert them through a UTC `Date` in a way that can shift the day.

### Styling and design direction
- Follow `.agents/skills/design-taste-frontend/SKILL.md` for visual design,
  typography, color tokens, layout rhythm, elevation, and motion.
- Keep all color/spacing/type values centralized in `src/styles/tokens.css`.
- Always preserve WCAG AA contrast, visible keyboard focus rings, and
  `prefers-reduced-motion`.
- Security, TypeScript strictness, API contracts, and testing rules in this
  file still apply.
### Frontend testing
- Vitest, React Testing Library, and user-event. Test the API wrapper, auth redirects, form validation and server errors, and loading, empty, and error states.

## Definition of done
A task is done only when: the code follows the rules above, new behavior has tests, the relevant checks pass (backend: `.\mvnw.cmd test`; frontend: `npm run lint`, `npm test`, `npm run build`), the feature works when run, and `docs/DECISIONS.md` has a short entry explaining the design choices and tradeoffs. Do not edit backend code in a frontend task unless the plan says it is necessary (for example CORS), and say why.

## Do not
- Do not commit, push, or create branches unless asked.
- Never read, print, or edit `.env`, and never hard-code secrets, passwords, tokens, or the JWT secret.
- Do not add dependencies or install skills or plugins without saying why.
- Do not change code outside the scope of the task.

## Commits
Short, specific subjects (for example `Add JWT register and login`). One feature per commit.