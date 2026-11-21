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
