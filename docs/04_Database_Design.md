# 04 — Database Design

Full source of truth: [backend/prisma/schema.prisma](../backend/prisma/schema.prisma)
(PostgreSQL 16, Prisma ORM). 37 models, 11 enums. This document explains the
*shape*, not every field — read the schema file alongside this for exact
columns.

## Design rules the whole schema follows

1. **Every tenant-owned model carries `schoolId`**, directly or one join
   away. `User.schoolId` is the anchor; `Class`, `Assessment` (via `Class`),
   `MessageThread` all trace back to it.
2. **Every content model stores locale variants as rows**, never a JSON
   blob keyed by locale. `LessonLocale` is one row per `(lessonId, locale)`
   — a missing Tetum translation is a query result (no row), not a runtime
   fallback to English.
3. **cuid() primary keys** everywhere — sortable-ish, collision-resistant,
   no auto-increment integer exposing row counts.
4. **Soft states over hard deletes** — a school is suspended
   (`SchoolsService.suspend` deactivates its users), never deleted; a
   refresh token is revoked, never removed, so a stolen-token replay is
   still detectable.

## Domain groups

### Tenancy & identity
`School`, `User`, `UserIdentity` (OAuth provider linking), `RefreshToken`
(rotation family + reuse detection), `Guardianship` (Parent↔Student, the
`studentIds` embedded in a Parent's JWT).

### Academic structure
`AcademicTerm`, `Class`, `Enrollment`, `Subject`, `Skill` (the taxonomy
`ProgressRecord` scores against), `CurriculumUnit`, `Lesson`, `LessonLocale`.

### Assessments & attempts
`Assessment`, `Question` (choices/correctAnswer stored as `Json`),
`Attempt`, `AttemptResponse`, `ProgressRecord` (the mastery EWMA — one row
per `(studentId, skillId)`).

### Gamification
`Badge`, `StudentBadge` — schema only; award logic is not yet implemented
(see [11_Gamification_System.md](11_Gamification_System.md)).

### AI (Step 4)
`AiConversation` (carries a rolling `summary` for memory compression),
`AiMessage` (full transcript, never deleted), `AiUsageLog` (every OpenAI
call: feature, model, tokens, estimated cost).

### Messaging & notifications
`MessageThread`, `ThreadParticipant`, `Message` — schema only, no
service/controller yet (Step 2's module list didn't include Messaging).
`Notification` is fully implemented (queued → sent, per-locale template).

### Reporting
`ProgressReport` — one row per `(studentId, periodStart, periodEnd)`;
`summary` (Json, deterministic) and `narrative` (AI-written paragraph, Step 4)
are separate fields deliberately, so the numbers are trustworthy even if the
prose generation is ever disabled.

### Audit
`AuditLog` — actor, action, target, metadata; written for sensitive
super-admin actions per the architecture's audit principle. No entries are
emitted automatically yet outside what a future impersonation feature would
need — the table exists ahead of that feature landing.

## Key relationships at a glance

```
School 1──* User (schoolId)
User (PARENT) *──* User (STUDENT)   via Guardianship
Class 1──* Enrollment *──1 User (STUDENT)
Class 1──* Assessment 1──* Question
Assessment 1──* Attempt 1──* AttemptResponse
User (STUDENT) 1──* ProgressRecord *──1 Skill
Lesson 1──* LessonLocale
AiConversation 1──* AiMessage
```

## Indexing strategy

- `User(schoolId, role)` — every school-scoped staff/roster query filters on both.
- `Attempt(studentId)`, `Attempt(assessmentId)` — the two directions a grading queue and a progress view read from.
- `AiUsageLog(feature, createdAt)` and `(userId, createdAt)` — cost rollups by feature or by user over a time window.
- `AuditLog(schoolId, createdAt)` — chronological audit review, scoped per school.
- No index (yet) on `LessonLocale.bodyMarkdown` — full-text search runs
  `to_tsvector()` at query time rather than against a stored/generated
  column; see [08_AI_Architecture.md](08_AI_Architecture.md) for why, and
  the upgrade path if the curriculum corpus grows large enough to need one.

## Migrations

`npm run prisma:migrate` (dev) / `prisma:deploy` (CI/prod) — see
[backend/package.json](../backend/package.json). No migrations have been
committed yet in this repo; the schema has been verified with
`prisma generate` + a full application boot against a schema-matching
client, but never run against a live migrated database in this environment
(no Postgres server was available to migrate against during development —
see [14_DevOps_Deployment.md](14_DevOps_Deployment.md) for the verification
method actually used).
