# 12 — Reporting & Analytics

Source: [backend/src/reports/](../backend/src/reports),
[backend/src/ai/report-narrative.service.ts](../backend/src/ai/report-narrative.service.ts).

## What's fully built: the weekly progress report

**Generation** — `ReportSchedulerService` runs a cron (`0 2 * * *`,
Asia/Dili) every night, enqueuing one `report-generation` job per active
student. `ReportGenerationProcessor`:

1. Computes a **deterministic** summary — mastery per skill
   (`ProgressRecord`), attempts completed and average score over the
   trailing 7 days. No AI call for this part; it's cheap enough to run for
   every student, every night.
2. If the student had at least one attempt that period, calls
   `ReportNarrativeService.generate()` for a one-paragraph, plain-language
   narrative in the student's locale (GPT-5 Mini). A student with zero
   activity gets no narrative — there's nothing true to say yet, and it
   saves a call.
3. Upserts one `ProgressReport` row per `(studentId, periodStart,
   periodEnd)`.

**Access** — `GET /reports/students/:studentId`, scoped via
`assertStudentScope`: the student themself, their linked guardian(s), or
school-wide roles. `POST /reports/students/:studentId/generate` lets any of
those roles queue an on-demand report rather than waiting for the nightly
run — same job, same processor.

## What a Principal/School Administrator can see today

Only aggregate counts, computed live on each page load — no persisted
analytics table:

- `SchoolsController` / `ClassesController` → class count, roster size,
  teacher assignment (`principal/page.tsx`'s stat cards).
- No trend-over-time view exists (e.g. "average mastery this month vs.
  last") — every number shown is a current snapshot.

## What doesn't exist: an operational analytics layer

- **No cost dashboard** — `UsageTrackerService.summarizeByFeature(since)`
  (`backend/src/ai/cost/usage-tracker.service.ts`) computes exactly the
  rollup an ops dashboard needs (calls and total cost per AI feature over a
  window), but nothing calls it from a controller. This is the
  lowest-effort, highest-value analytics addition available today — the
  query already exists.
- **No school-comparison view for Super Admin** — `GET /schools` lists
  every school, but nothing aggregates activity or outcomes across them.
- **No data export** — a school administrator cannot download their
  school's data as CSV/Excel; this would also need an `AuditLog` entry per
  the architecture's audit principle for any bulk export, which the
  `AuditLog` model is ready for but nothing writes to yet.

## Recommended build order for analytics

1. Expose `UsageTrackerService.summarizeByFeature` via a Super-Admin-only
   endpoint — the data already exists, this is routing plus a guard.
2. A `GET /schools/:id/analytics` endpoint aggregating class-level mastery
   and attempt volume, for the Principal Dashboard's next iteration.
3. Trend data requires a decision on retention — either keep every
   `ProgressReport` forever (cheap, one row per student per week) and query
   across them, or add a dedicated rollup table if per-week granularity
   proves too fine for a term-over-term view.
