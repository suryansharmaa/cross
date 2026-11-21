# Repository Guidelines

## Project
"Cross" is a free-trial and subscription tracker: users log trials/subscriptions with billing dates, see spend, and get email alerts before a trial converts to a paid plan. Stack: Spring Boot 4.x (Java 17, Maven), PostgreSQL 16, Flyway, Spring Security with JWT. A React frontend (Vite) will be added later in `frontend/`. The feature list and acceptance criteria are in `docs/SPEC.md`.

## Structure
- `backend/` Spring Boot module. Base package `com.Cross.backend` (keep this casing).
- `docker-compose.yml` PostgreSQL 16 for local dev (host port 5434, database and user `cross`).
- Config: `backend/src/main/resources/application.properties`. Schema changes go in Flyway migrations under `backend/src/main/resources/db/migration`.
- `docs/SPEC.md` is the source of truth for features. `docs/DECISIONS.md` records design decisions.

## Run, build, test
- Start DB from repo root: `docker compose up -d db`. `DB_PASSWORD` comes from the ignored root `.env` file and must be set in the shell that runs Maven.
- From `backend/`: `.\mvnw.cmd spring-boot:run`, `.\mvnw.cmd test`, `.\mvnw.cmd clean verify` (use `./mvnw` outside PowerShell).
- The JVM timezone must be `Asia/Kolkata`, because the legacy name `Asia/Calcutta` is rejected by PostgreSQL. `BackendApplication.main` sets it; keep that.

## Architecture rules
- Layering: controller -> service -> repository. No business logic in controllers, no entities returned from controllers.
- Use DTOs for requests and responses, with Bean Validation on request DTOs.
- One global exception handler returns consistent error responses.
- Every endpoint that returns user data must be scoped to the authenticated user. Never trust a user id from the request.
- Schema changes only through new Flyway migrations. Never edit an applied migration. Keep `spring.jpa.hibernate.ddl-auto=validate`.
- This project uses recent Spring Boot and Spring Security versions. Check the dependencies in `pom.xml` and the actual APIs available; do not assume older APIs.

## Testing
- JUnit Jupiter, test classes named `*Tests.java`, mirroring the main package tree.
- Every service class gets unit tests, including edge cases. Billing-date logic needs tests for month-end and leap-year cases.
- Add integration tests for new endpoints, including the unauthorized case.

## Definition of done
A task is done only when: the code follows the layering rules, new behavior has tests, `.\mvnw.cmd test` passes, and `docs/DECISIONS.md` has a short entry explaining the design choices and tradeoffs made.

## Do not
- Do not commit, push, or create branches unless asked.
- Never read, print, or edit `.env`, and never hard-code secrets, passwords, or the JWT secret.
- Do not add dependencies without saying why.
- Do not change code outside the scope of the task.

## Commits
Short, specific subjects (for example `Add JWT register and login`). One feature per commit.

