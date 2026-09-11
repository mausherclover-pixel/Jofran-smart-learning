# 13 — Security & Compliance

Source: architecture §15, cross-checked against the actual implementation
in [backend/src/auth](../backend/src/auth), [backend/src/common](../backend/src/common).

## Authentication

| Control | Implementation |
|---|---|
| Password hashing | `argon2id` (`auth.service.ts`) — never logged, never returned in any response |
| Access tokens | JWT, 15-minute expiry, signed with `JWT_ACCESS_SECRET` |
| Refresh tokens | Opaque-to-the-client JWT, httpOnly cookie, 30-day expiry, **rotation with reuse detection** — a replayed already-used refresh token revokes its entire token family (`token.service.ts`) |
| OAuth | Google and Microsoft, identity linked via `UserIdentity` (provider + providerId), never creating a duplicate `User` for an existing email |
| Same-origin protection | `sameSite: 'lax'` on the refresh cookie, scoped to `/v1/auth` path |

**Verified gap:** OAuth strategies (`GoogleStrategy`, `MicrosoftStrategy`)
fall back to a placeholder `clientID`/`clientSecret` when unset, specifically
so the app can boot in an environment without OAuth configured — this was a
real bug caught during Step 2 verification (the app crashed at startup
without real Google credentials). The fallback means `/auth/google` will
simply fail at Google's side, not at Nest's bootstrap, when credentials
aren't configured — acceptable for local dev, but **production deployment
must set real values** or these routes are silently non-functional.

## Authorization (RBAC + tenant scoping)

- Global `JwtAuthGuard` — every route requires a valid access token unless
  explicitly `@Public()`.
- `RolesGuard` + `@Roles()` — role-level access control, works identically
  across REST and GraphQL (`GqlExecutionContext` branch).
- `common/scope/scope.util.ts` — the `schoolId`/`classId`/`studentId`
  scoping helpers every service calls before touching tenant data. See
  [03_System_Architecture.md](03_System_Architecture.md) for the layered
  explanation.

## Data protection

| Concern | Approach |
|---|---|
| Student PII minimization | Students log in with a school-issued username, no email or birthdate required (`CreateStudentDto`) |
| Sensitive fields excluded from responses | `SAFE_SELECT` projections in `UsersService`/`StudentsService` never return `passwordHash` |
| Encryption in transit | TLS assumed at the load balancer (ALB) — see [14_DevOps_Deployment.md](14_DevOps_Deployment.md); not something the application layer configures itself |
| Encryption at rest | Delegated to AWS (RDS/S3 KMS) — not application-layer, not yet provisioned (no infra has actually been deployed) |

## Rate limiting

- Global: `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])` — 120
  requests/minute/IP by default.
- Tightened on `/auth/login`: `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.
- Feature-specific: Jojo chat capped at `JOJO_DAILY_MESSAGE_LIMIT` (default
  60) messages per student per day via Redis (`RateLimiterService`) —
  a business quota, not a generic route limit.

## Content safety

- OpenAI's moderation endpoint runs on every Jojo chat message **before**
  it reaches a generation call (`JojoService.sendMessage`).
- Every Jojo conversation is fully logged (`AiMessage`, never deleted) and
  visible to the student's teacher and linked guardian(s) — a transparency
  control, framed explicitly as not-surveillance in the architecture
  document and in code comments.

## Audit logging

`AuditLog` model exists (actor, action, target, metadata, scoped by
school) but **nothing writes to it yet** — no controller or service calls
`prisma.auditLog.create()` anywhere in the current codebase. The
architecture specifies it should log grade overrides, super-admin
impersonation, and bulk data exports; none of those three features exist
yet either, which is at least internally consistent (there's nothing to
audit that isn't already audited by absence), but this table should not be
presented as "audit logging is implemented" — it is schema-ready, not
active.

## Compliance posture (honest summary)

This is a functional security *design* with real, verified controls for
authentication, authorization, and tenant isolation. It has **not** been
through a third-party security review, has no penetration test history,
and several controls described in the architecture document (audit
logging, encryption-at-rest provisioning, a formal data-retention policy
for `AiMessage`/`AiConversation`) exist as intent or schema but not as
running, enforced behavior. Treat this document as an accurate map of what
protects the system today, not a compliance certification.
