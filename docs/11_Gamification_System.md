# 11 — Gamification System

**Status: schema only.** This is the most honest way to open this document —
`Badge` and `StudentBadge` exist in [backend/prisma/schema.prisma](../backend/prisma/schema.prisma),
but no service awards a badge, no endpoint lists available badges, and no
frontend surface shows one. The architecture document (§05) lists "streaks
and badges" as part of the Progress module's scope; that scope has not been
built yet.

## What exists today

```prisma
model Badge {
  id, code, name, description, iconKey   // iconKey: an S3 key under avatars/badges/ — MediaModule dependency
  awards StudentBadge[]
}
model StudentBadge {
  studentId, badgeId, awardedAt
  @@unique([studentId, badgeId])
}
```

Nothing writes to `StudentBadge` anywhere in the codebase today.

## What "streak" means in the architecture, and its actual state

The Student Dashboard frontend page shows a "Streak" stat card
(`app/(app)/student/page.tsx`) — but reading the code honestly, it currently
displays `progress.data?.length` (the *count of skills the student has any
`ProgressRecord` for*), not a day-over-day activity streak. It's a
placeholder metric wearing a streak's label, not a real streak
implementation. A true streak needs a new field (e.g.
`User.lastActiveDate` + `currentStreakDays`) and a daily job or
login-time check to increment/reset it — neither exists.

## Intended design (spec, not yet built)

**Badge award triggers**, evaluated as a side effect of
`AttemptsService.finalize()` or `ConversationMemoryService`-adjacent
events, candidates being:

| Badge idea | Trigger condition |
|---|---|
| First Quiz | First `Attempt` reaching `GRADED` status |
| Skill Mastered | A `ProgressRecord.mastery` crosses 0.9 for the first time |
| Perfect Score | `Attempt.score === Attempt.maxScore` |
| Week Streak | 7 consecutive calendar days with at least one graded attempt |

**Leaderboard** (mentioned in architecture §08 as a WebSocket use case,
`quiz:{quizId}:board` room) — also unbuilt. The intended mechanism is a
Redis sorted set (`ZADD`/`ZRANGE`), live only during an active quiz window,
not a persisted all-time ranking — this avoids ever creating a
persistent cross-student comparison that could feel punitive to a
struggling student, consistent with the platform's child-safety framing.

## Why this wasn't built in Steps 1–4

The original Step 2 backend prompt's module list (Auth, Users, Schools,
Student, Parent, Teacher, Academic, Quiz, Report, Notification) did not
include a distinct Gamification module, and it wasn't requested explicitly
until this Developer Pack step named it. Building it now, retroactively,
would mean inventing trigger rules without a design conversation — the spec
above is offered as a starting point for that conversation, not as
already-decided product behavior.

## Recommended next step

Before implementing award logic, decide: should badges be purely
celebratory (no comparison between students) or include any competitive
element? The architecture's existing child-safety framing (§11: "never a
persistent cross-student comparison that feels punitive") suggests
celebratory-only, ephemeral-leaderboard is the safer default for Grade 1–6 —
but that's a product decision this document flags rather than makes.
