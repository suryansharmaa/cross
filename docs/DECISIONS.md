# Design decisions

## Accounts

Spring Security Resource Server uses Nimbus to verify HS256 bearer tokens signed
with the environment-provided key. Each protected request checks that the signed
UUID belongs to an existing account. This costs one lookup and makes account
deletion immediately revoke access without a token store.

PostgreSQL enforces uniqueness on normalized email, including concurrent
registrations. BCrypt receives the original password after character and UTF-8
byte validation. Registration points to the authenticated current-account URL.

## Known gaps

Login has no rate limiting in v1.

## Subscriptions

Subscription queries use the authenticated account UUID and scope item lookups to
that owner. Creation locks the account row before counting all subscriptions so
concurrent requests cannot exceed 100. PostgreSQL cascades account deletion and
enforces trial-date consistency. JPA versioning detects concurrent changes.
An already cancelled row is returned unchanged on repeat cancellation.
Start-date bounds use Asia/Kolkata with the shared injected clock, and amounts
use fixed-scale INR decimals.

Subscription responses calculate the next billing date on demand using the
injected clock in Asia/Kolkata. A pure calculator accepts an explicit date so
reminders can reuse it. It estimates the cycle index directly and checks at
most two dates, each calculated from the original anchor to avoid date drift.
Keeping the date computed avoids storing a value that becomes stale as time passes.

## Dashboard

The 100-subscription cap lets the dashboard aggregate a single owner-scoped
read of active rows in memory. The dashboard and subscription endpoints share
the Kolkata date calculation and billing anchors. Exact annual totals are
summed before monthly rounding, so per-subscription rounding errors do not
accumulate. The dashboard requires no persisted aggregates.


## Reminders

A PostgreSQL advisory transaction lock coordinates the cron and scheduler.
Each subscription commits independently, and the unique alert key makes
same-window retries safe. The lock transaction holds one connection while
workers use another. The cron endpoint uses a separate security chain and
compares fixed-length digests of the configured and supplied credentials.

The in-app alert is available as soon as its row commits. A future email
channel will enqueue a delivery record alongside the alert with a unique
notification and channel pair. A worker will send outside the transaction
using a stable provider idempotency key, then record success or retry state
on the delivery row. Reminder deduplication stays at the alert insert.

## Subscription management (6b)

The shared protected shell redirects the root to subscriptions while the
dashboard is pending. Subscription queries are scoped to the authenticated
account, invalidated after writes, and cleared on session end. Protected API
rejections use the existing session-expiry redirect. Date-only display uses
an explicit timezone and form bounds use the Kolkata business date.

## Frontend authentication (6a)

Vite sends requests directly to the API using its configured base URL and the
backend's existing localhost CORS allowlist. Each tab stores one session with
the server's expiry. Expiry and logout cancel and remove the current-user
query. A protected 401 ends the session while invalid credentials on the login
request leave the form available for another attempt.

The client checks email length and requires exactly one at sign with nonempty,
whitespace-free text on both sides. The API handles stricter validation. The
fixed palette uses muted input borders, accent focus rings with an offset,
and error text on light surfaces. Labels and live error messages accompany
those visual cues.

## Dashboard, notifications, and account deletion (6c)

The dashboard presents server-calculated spend and uses annual totals for
category proportions. Dashboard and notification queries are scoped to the
signed-in account. Subscription writes refresh the dashboard, and subscription
deletion refreshes notification queries because the database cascades those rows.
Notification read actions refresh both the list and the shared unread count.

Account deletion uses an inline email confirmation and the existing authenticated
DELETE endpoint. The auth provider uses one teardown path to cancel and remove
queries on logout, expiry, and deletion, with a distinct notice after deletion.
Calendar dates retain the 6b formatter and timestamps display in Asia/Kolkata.
