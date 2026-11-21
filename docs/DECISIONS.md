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
