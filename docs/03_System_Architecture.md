# 03 — System Architecture

Full version with diagrams: [jofran-architecture.html](../jofran-architecture.html)
(published architecture artifact, v1.0). This document is the git-reviewable
markdown companion — same content, condensed to text.

## Shape of the system

One NestJS process (a **modular monolith**, not microservices), one
PostgreSQL database, one Redis instance backing both cache and BullMQ. A
request takes one of three paths:

1. **REST** — auth, CRUD, most reads/writes. `/v1/*`.
2. **GraphQL** — composite dashboard queries with a variable, nested shape
   per role (e.g. a Parent's multi-child summary). `/graphql`.
3. **Direct-to-storage** — large media bypasses the API via a signed URL
   (designed, not yet wired — see [16_Roadmap.md](16_Roadmap.md)).

A parallel **WebSocket** path (`/notifications` namespace) handles anything
live: push notifications today; live-classroom sessions and quiz
leaderboards are designed but not yet built.

## Why a modular monolith

Six roles, one country, a handful of schools at launch. The operational
cost of a service mesh — multiple deployables, inter-service auth,
distributed tracing — would outweigh its benefit at this scale. Module
boundaries in `backend/src/*` mirror the domain exactly (see
[07_Backend_Development.md](07_Backend_Development.md)'s module map), so
extracting one later (the AI module is the obvious candidate) stays
possible without a rewrite.

## The one boundary that matters: `schoolId`

Every role except Super Administrator is confined to exactly one school.
This is enforced three ways, layered:

1. **JWT claims** — `schoolId`, and for a Teacher the list of `classId`s
   they're assigned, are embedded at login/refresh (`buildAccessClaims`,
   `backend/src/auth/scope-claims.util.ts`) — never re-derived per request.
2. **Guards** — `RolesGuard` checks the role; scope itself is checked
   inside each service via `common/scope/scope.util.ts`'s
   `assertSchoolScope` / `assertClassScope` / `assertStudentScope`.
3. **Query construction** — services filter by the scoped id directly
   (`where: { schoolId }`), so an unscoped query is a code-review smell,
   not just a runtime risk.

A stale claim (a reassigned teacher) self-corrects within one access-token
lifetime — 15 minutes.

## Data flow for the two features worth tracing end-to-end

**A graded quiz attempt:** Student submits → multiple-choice questions
score synchronously in the API; constructed-response questions enqueue onto
the `ai-grading` BullMQ queue → `AiGradingProcessor` calls OpenAI (GPT-5
Mini, escalating to GPT-5 on low confidence) → writes the score → once every
response on the attempt has a score, `AttemptsService.finalize()` updates
`ProgressRecord` (the mastery EWMA) for every skill involved.

**A Jojo chat turn:** Message arrives at `JojoService.sendMessage` →
daily-quota check (Redis) → OpenAI moderation → (if clean) full-text search
across published curriculum for relevant context + the conversation's
rolling memory summary + recent turns → one chat completion → usage logged
to `AiUsageLog` → both turns persisted to `AiMessage` (never deleted) →
memory re-summarized if the window overflowed.

## Environments

| Environment | Where it runs |
|---|---|
| Local dev | `docker compose up` (Postgres + Redis) + `npm run start:dev` / `npm run dev` |
| Staging/Prod | AWS ECS Fargate, RDS Multi-AZ, ElastiCache — see [14_DevOps_Deployment.md](14_DevOps_Deployment.md) |

## Cross-references

- Database: [04_Database_Design.md](04_Database_Design.md)
- Backend module map: [07_Backend_Development.md](07_Backend_Development.md)
- AI layer: [08_AI_Architecture.md](08_AI_Architecture.md)
- Security controls: [13_Security_Compliance.md](13_Security_Compliance.md)
