# 16 — Roadmap

This consolidates every gap flagged honestly across documents 01–15 into
one prioritized list, plus the original phased rollout from the
architecture document (§17). Nothing here contradicts an earlier document —
this is where they're gathered into a single next-actions view.

## Immediate (blocks a real pilot)

1. **Production secrets** — `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and
   real Google/Microsoft OAuth credentials must be set before any
   non-local deployment ([13_Security_Compliance.md](13_Security_Compliance.md)).
2. **Provision actual infrastructure** — nothing described in
   [14_DevOps_Deployment.md](14_DevOps_Deployment.md) has been deployed;
   this whole build has been verified locally/in a sandbox, never against
   live AWS.
3. **CI pipeline** — wire the exact verification commands already used
   manually (`typecheck` → `test` → `build` → boot check) into GitHub
   Actions, so every PR gets the same scrutiny this Developer Pack's claims
   did.

## High value, small effort

4. **Expose `UsageTrackerService.summarizeByFeature`** as a Super-Admin
   endpoint — the query exists, only routing is missing
   ([12_Reporting_Analytics.md](12_Reporting_Analytics.md)).
5. **Retry/backoff on OpenAI calls** — currently a transient failure
   surfaces as an error with no retry ([09_OpenAI_Integration.md](09_OpenAI_Integration.md)).
6. **Structured logging** (pino) — replace NestJS's default `Logger` so a
   production incident is debuggable from log queries, not raw container
   output ([14_DevOps_Deployment.md](14_DevOps_Deployment.md)).

## Feature gaps (designed or schema-ready, not implemented)

| Gap | State | Where it's tracked |
|---|---|---|
| Adaptive question selection | Mastery is tracked; nothing reads it to pick the next question | [10_Learning_Engine.md](10_Learning_Engine.md) |
| Gamification (badges, streaks, leaderboard) | Schema exists; no award logic | [11_Gamification_System.md](11_Gamification_System.md) |
| Messaging (teacher–parent threads) | Prisma models exist; no service/controller | [04_Database_Design.md](04_Database_Design.md) |
| S3 / MediaModule | No signed-upload path; blocks lesson video, submission photos, TTS caching | [09_OpenAI_Integration.md](09_OpenAI_Integration.md) |
| Manual grade override | Teacher grading queue is read-only today | [06_Frontend_Development.md](06_Frontend_Development.md) |
| PDF report rendering | `summary` + `narrative` exist; no PDF generation or S3 upload | [12_Reporting_Analytics.md](12_Reporting_Analytics.md) |
| Story/Quiz Generator UI | Backend endpoints exist; no teacher-facing form | [06_Frontend_Development.md](06_Frontend_Development.md) |
| Listening/Speaking Assistant UI | Backend endpoints exist; no mic/audio-player component | [08_AI_Architecture.md](08_AI_Architecture.md) |
| Quiz resume after refresh | Every "start" creates a new `Attempt` | [10_Learning_Engine.md](10_Learning_Engine.md) |
| Audit log writes | Table exists; nothing writes to it | [13_Security_Compliance.md](13_Security_Compliance.md) |
| Automated tests | 49 unit tests now cover scope/RBAC/token-rotation/mastery/pricing/templates; no integration or e2e tests against a real database yet | [07_Backend_Development.md](07_Backend_Development.md) |

## Phased rollout (architecture §17, unchanged)

**Phase 1 — Pilot (Dili & Baucau).** Core auth and all six roles; Math and
Tetum-literacy curriculum for grades 1–3; auto-graded quizzes; parent
progress view. *(Steps 1–4 of this build cover the technical foundation for
this phase; the feature gaps above are what stand between "the platform
runs" and "the pilot is feature-complete.")*

**Phase 2 — Full grade range, AI tutor.** Grades 1–6 across all subjects;
adaptive difficulty engine (needs item 1 above); AI tutor chat *(built —
Jojo, Step 4)*; Bahasa Indonesia locale *(the platform already supports
this — content authoring is the remaining work, not code)*; teacher
analytics dashboards; WebSocket live-classroom sessions.

**Phase 3 — National rollout.** Expansion beyond pilot municipalities;
principal and super-admin analytics suite; resilient client-side caching
for low-connectivity schools; SMS notification fallback (the `SMS` channel
enum and a stub log line exist in `NotificationChannel` — a real SMS
gateway integration is the remaining work).

## How to use this document

Each gap above is small enough to be its own well-scoped task — that was
deliberate. None of them require re-architecting what exists; each slots
into a module boundary that's already in place.
