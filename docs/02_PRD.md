# 02 — Product Requirements Document

## Personas

| Persona | Age / context | Primary need |
|---|---|---|
| **Student** | 6–13, Grade 1–6 | Lessons and practice pitched at the right difficulty, in a language they read comfortably |
| **Parent** | Adult guardian, variable literacy/device access | A clear, jargon-free picture of how their child is doing, without logging in daily |
| **Teacher** | Certified primary teacher, one or more classes | Assign work, grade quickly, spot who's falling behind |
| **Principal** | School academic lead | Whole-school visibility without digging through every class |
| **School Administrator** | School operations lead | Staff and enrollment management, subscription status |
| **Super Administrator** | Jofran platform team | Cross-school oversight, curriculum publishing, support |

## User stories by role

**Student**
- As a student, I log in with a username my school gave me (not an email), so I don't need my own email account.
- As a student, I see my assigned quizzes and can start, answer, and submit one.
- As a student, I can ask Jojo a question about my current lesson and get an answer in my own language.
- As a student, I can see my own mastery-by-skill chart and past weekly reports.

**Parent**
- As a parent, I see all my children in one place, even if they're in different classes.
- As a parent, I see a plain-language weekly note about each child, not just a percentage.
- As a parent, I can drill into one child's mastery chart and report history.

**Teacher**
- As a teacher, I see only the classes assigned to me.
- As a teacher, I can build a quiz with multiple-choice and written-answer questions.
- As a teacher, I see a grading queue for anything not yet scored — knowing most of it is already being graded by Jojo, not waiting on me.
- As a teacher, I can generate a first-draft quiz or story from a lesson and edit it before using it.

**Principal / School Administrator**
- As a principal, I see every class, teacher, and roster size in my school in one view.
- As a school administrator, I can create classes and enroll students.

**Super Administrator**
- As a super administrator, I see every school on the platform.
- As a super administrator, I can create a new school registration.

## Functional requirements

1. **Authentication** — password login (username for students, email for
   staff/parents) plus Google and Microsoft OAuth; 15-minute access tokens
   with rotating refresh tokens (reuse detection revokes the session
   family).
2. **RBAC** — six roles, enforced by a global guard plus per-route
   `@Roles()`; tenant isolation by `schoolId` enforced in the service layer,
   never left to a query the controller forgot to scope.
3. **Curriculum** — subjects → units → lessons, each lesson locale-variant
   published independently; cached reads (§10 of the architecture doc).
4. **Assessments** — multiple-choice (synchronous auto-grade) and
   constructed-response (async AI grade via GPT-5 Mini, escalating to GPT-5
   on low confidence).
5. **Adaptive learning** — a per-skill mastery score (EWMA) updates on every
   graded attempt; see [10_Learning_Engine.md](10_Learning_Engine.md).
6. **AI Teacher Jojo** — chat scoped to the current lesson plus
   full-text-search-retrieved curriculum context, TTS/transcribe for
   listening/speaking practice, daily rate limit, moderation before every
   generation call.
7. **Reporting** — nightly per-student progress report (deterministic
   mastery rollup + AI-written narrative), viewable by the student, their
   guardians, and school-wide roles.
8. **Notifications** — per-locale templated push/email/SMS, fanned out via
   a queue; push delivered over WebSocket.
9. **Internationalization** — Tetum, English, Bahasa Indonesia as
   first-class, independently publishable content variants.

## Non-functional requirements

| Requirement | Target / approach |
|---|---|
| Availability | Managed AWS services (RDS Multi-AZ, ElastiCache); see [14_DevOps_Deployment.md](14_DevOps_Deployment.md) |
| Performance | Server-rendered first paint (Next.js), curriculum reads cache-first |
| Data residency | `ap-southeast-1` (Singapore) — nearest AWS region; no in-country region exists |
| Security | argon2id password hashing, httpOnly refresh cookie, per-route rate limiting, OpenAI moderation pre-check |
| Localization | No hardcoded UI or content strings in one language; every content model is locale-row-based |
| Accessibility | Large touch targets (shadcn/ui defaults), keyboard-navigable forms |
| Privacy | Minimal student PII — school-issued username, no email/birthdate required |

## Out of scope for the current build

- Native mobile apps (PWA/responsive web only)
- Offline-first sync (assumed reliable connectivity per Step 1 scoping decision)
- Payment/billing processing
- Teacher–parent messaging threads (schema exists, no service — see [16_Roadmap.md](16_Roadmap.md))

## Success metrics (proposed, not yet instrumented)

- Weekly active students per school
- % of assessments graded within 5 minutes of submission
- Parent report open rate
- Jojo conversations per student per week
- AI cost per active student per month (trackable today via `AiUsageLog` — see [09_OpenAI_Integration.md](09_OpenAI_Integration.md))
