# 07 — Backend Development

Source: [backend/](../backend), see [backend/README.md](../backend/README.md)
for setup. Verified: `npm install` → `prisma generate` → `tsc --noEmit` →
`nest build` → full application boot, all clean — the boot test confirms
every module's dependency-injection graph resolves (it only stops on
`ECONNREFUSED` to Postgres/Redis, which don't run in the verification
sandbox).

## Module map

| Module | Path | Owns |
|---|---|---|
| `auth` | `src/auth/` | Login, refresh rotation, Google/Microsoft OAuth, JWT strategy |
| `users` | `src/users/` | Cross-role profile CRUD |
| `schools` | `src/schools/` | School registry (Super Admin only) |
| `students` | `src/students/` | Student accounts, enrollment, progress |
| `parents` | `src/parents/` | Guardian linking, children view |
| `teachers` | `src/teachers/` | Class roster, grading queue |
| `academic` | `src/academic/` | Classes, subjects, curriculum, lessons |
| `quiz` | `src/quiz/` | Assessments, attempts, `ai-grading` worker |
| `reports` | `src/reports/` | Progress reports, nightly cron, `report-generation` worker |
| `notifications` | `src/notifications/` | Templates, `notification-fanout` worker, WS gateway |
| `dashboard` | `src/dashboard/` | GraphQL resolver (`parentDashboard`) |
| `ai` | `src/ai/` | Jojo, RAG, memory, cost tracking, content generation — see [08_AI_Architecture.md](08_AI_Architecture.md) |
| `common` | `src/common/` | Prisma/Redis/Queue providers, guards, decorators, scope utilities |

## Conventions every module follows

**Controllers stay thin.** A controller extracts `@CurrentUser()`, applies
`@Roles()`, and calls exactly one service method — no business logic, no
Prisma calls, in a controller file.

**Scope checks happen in the service, not the controller.** Every method
that touches tenant-owned data calls `assertSchoolScope` /
`assertClassScope` / `assertStudentScope` (`common/scope/scope.util.ts`) as
its first line, or does the equivalent enrollment-based DB check when those
three generic helpers don't cover the case (e.g.
`AssessmentsService.assertCanView`, `JojoService.assertCanView`).

**DTOs validate everything.** `class-validator` decorators on every DTO;
the global `ValidationPipe` (`main.ts`) runs with `whitelist: true,
forbidNonWhitelisted: true` — an unexpected field in a request body is
rejected, not silently dropped or accepted.

**One Role enum, re-exported.** `common/enums/role.enum.ts` re-exports
Prisma's generated `Role` rather than declaring a parallel enum — this was
a real bug found during Step 2 verification (two structurally-identical but
nominally-different TypeScript enums failing to compare) and fixed at the
source rather than patched at every call site.

## Background jobs (BullMQ)

| Queue | Producer | Consumer |
|---|---|---|
| `ai-grading` | `AttemptsService.submit` | `AiGradingProcessor` (quiz module) |
| `notification-fanout` | `NotificationsService.notify` | `NotificationFanoutProcessor` |
| `report-generation` | `ReportSchedulerService` (nightly cron, Asia/Dili) or `ReportsService.requestNow` | `ReportGenerationProcessor` |
| `media-transcode` | *(designed, not producing yet — no upload path exists)* | — |
| `cache-invalidation` | *(folded into `CurriculumService` directly today, not queued)* | — |

## Real-time (WebSocket)

`NotificationsGateway` (`src/notifications/notifications.gateway.ts`) —
namespace `/notifications`, room key `user:{userId}`, authenticated with the
same short-lived access token as REST. `RedisIoAdapter`
(`common/websocket/redis-io.adapter.ts`) fans a message out across multiple
API instances via Redis pub/sub — necessary the moment this runs as more
than one process.

## GraphQL

One resolver today: `ParentDashboardResolver` (`src/dashboard/`). Schema is
code-first (`@nestjs/graphql` decorators), auto-generated to
`src/schema.gql` on build (gitignored — regenerated, not hand-maintained).
The same `JwtAuthGuard`/`RolesGuard`/`CurrentUser` work across both REST and
GraphQL contexts (`GqlExecutionContext` branch in each).

## Testing status

`npm test` runs a Jest suite — 49 tests across 6 files, all passing —
covering the highest-risk logic in the codebase:

| File | Covers |
|---|---|
| `common/scope/scope.util.spec.ts` | Every role × every branch of the tenant-isolation boundary (§04) |
| `common/guards/roles.guard.spec.ts` | RBAC enforcement, including that Super Admin is exact-match, not an implicit bypass |
| `auth/token.service.spec.ts` | Refresh-token rotation and reuse detection (§07) — the single most security-critical path in the app |
| `quiz/mastery.util.spec.ts` | The EWMA mastery calculation (§11), extracted from `AttemptsService` into a pure, testable module |
| `ai/config/model-pricing.spec.ts` | Cost-estimation math |
| `notifications/templates.spec.ts` | Every notification template renders in all three locales |

These are unit tests against pure functions and mocked dependencies
(`PrismaService`, `JwtService`, `Reflector`) — no integration or e2e test
runs against a real database yet. A Testcontainers-backed integration suite
for the auth flow and RBAC guards end-to-end is the natural next addition —
see [16_Roadmap.md](16_Roadmap.md).

## Local development

```bash
cp .env.example .env        # add OPENAI_API_KEY to exercise the AI module
docker compose up -d
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```
