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
