# 15 — API Documentation

Base URL: `http://localhost:4000/v1` (REST) · `http://localhost:4000/graphql` (GraphQL).
Extracted directly from the controller source — see the "Role" column for
the exact `@Roles()` guard; "any authenticated" means any logged-in user
reaches the handler, with scoping enforced inside the service (not shown
here — see [03_System_Architecture.md](03_System_Architecture.md)).

## Auth (`/auth`) — all `@Public()` except `logout`

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ identifier, password }` → `{ accessToken }` + sets refresh cookie. Throttled to 5/min. |
| POST | `/auth/refresh` | Reads the httpOnly refresh cookie → rotates it → `{ accessToken }` |
| POST | `/auth/logout` | Revokes the current refresh token family |
| GET | `/auth/google`, `/auth/google/callback` | Google OAuth2 flow |
| GET | `/auth/microsoft`, `/auth/microsoft/callback` | Microsoft OAuth2 flow |

## Users (`/users`)

| Method | Path | Role |
|---|---|---|
| GET | `/users/me` | Any authenticated |
| GET | `/users?schoolId=` | Super Admin, School Admin, Principal |
| GET | `/users/:id` | Any (scope-checked in service) |
| PATCH | `/users/:id` | Any (self or same-school staff role) |
| DELETE | `/users/:id` | Super Admin, School Admin (deactivates, doesn't hard-delete) |

## Schools (`/schools`)

| Method | Path | Role |
|---|---|---|
| POST | `/schools` | Super Admin |
| GET | `/schools` | Super Admin |
| GET | `/schools/:id` | Any (scope-checked) |
| PATCH | `/schools/:id` | Super Admin, School Admin |
| PATCH | `/schools/:id/suspend` | Super Admin |

## Students (`/students`)

| Method | Path | Role |
|---|---|---|
| POST | `/students` | School Admin, Principal, Teacher |
| GET | `/students/by-class/:classId` | Any (class-scope-checked) |
| GET | `/students/:id` | Any (student-scope-checked) |
| GET | `/students/:id/progress` | Any (student-scope-checked) |

## Parents (`/parents`)

| Method | Path | Role |
|---|---|---|
| POST | `/parents/link` | School Admin, Principal, Teacher |
| GET | `/parents/me/children` | Parent |
| GET | `/parents/children/:studentId/progress` | Parent |

## Teachers (`/teachers`) — all Teacher role

| Method | Path |
|---|---|
| GET | `/teachers/me/classes` |
| GET | `/teachers/me/pending-grading` |

## Academic — Classes (`/classes`)

| Method | Path | Role |
|---|---|---|
| POST | `/classes` | School Admin, Principal |
| GET | `/classes?schoolId=` | Super Admin, School Admin, Principal |
| GET | `/classes/:id` | Any (class-scope-checked) |

## Academic — Curriculum (`/curriculum`)

| Method | Path | Role |
|---|---|---|
| GET | `/curriculum/subjects?grade=` | Any authenticated |
| GET | `/curriculum/lessons/:id?locale=` | Any authenticated (Redis-cached) |
| POST | `/curriculum/lessons/:id/locales` | Super Admin, School Admin |
| PATCH | `/curriculum/lessons/:id/publish` | Super Admin, School Admin |

## Quiz — Assessments (`/assessments`)

| Method | Path | Role |
|---|---|---|
| POST | `/assessments` | Teacher |
| GET | `/assessments?classId=` | Any (class-scope-checked) |
| GET | `/assessments/:id` | Any (correctAnswer stripped for Student role) |

## Quiz — Attempts (`/attempts`) — all Student role

| Method | Path |
|---|---|
| POST | `/attempts/:assessmentId/start` |
| POST | `/attempts/:attemptId/answers` — `{ questionId, answer }` |
| POST | `/attempts/:attemptId/submit` |

## Reports (`/reports`)

| Method | Path | Role |
|---|---|---|
| GET | `/reports/students/:studentId` | Any (student-scope-checked) |
| POST | `/reports/students/:studentId/generate` | Any (student-scope-checked) — queues an on-demand report |

## Notifications (`/notifications`)

| Method | Path | Role |
|---|---|---|
| GET | `/notifications/me?unread=true` | Any authenticated |
| PATCH | `/notifications/:id/read` | Any authenticated (own notifications only) |

## AI — Jojo (`/ai/jojo`)

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/ai/jojo/conversations` | Student | `{ lessonId? }` → new `AiConversation` |
| POST | `/ai/jojo/conversations/:id/messages` | Student | `{ content }` → `{ reply, flagged }` |
| GET | `/ai/jojo/conversations/:id` | Student (own) / Parent (child) / Teacher (their student) / school-wide roles | Full transcript |
| POST | `/ai/jojo/listen` | Student | `{ text, locale }` → raw `audio/mpeg` bytes |
| POST | `/ai/jojo/speak` | Student | multipart: `audio` file + optional `targetPhrase` → `{ transcript, feedback? }` |

## AI — Content Generation (`/ai/content`) — Teacher, School Admin, Super Admin

| Method | Path | Notes |
|---|---|---|
| POST | `/ai/content/story` | `{ grade, subjectSlug, locale, theme }` → `{ story, cached }` |
| POST | `/ai/content/quiz-draft` | `{ lessonId, questionCount }` → draft `Question[]` (never auto-published) |

## Health

| Method | Path |
|---|---|
| GET | `/health` (note: outside the `/v1` prefix — `http://localhost:4000/health`) |

## GraphQL (`/graphql`)

One query today:

```graphql
query ParentDashboard {
  parentDashboard {
    children {
      id
      fullName
      className
      grade
      averageMastery
      pendingAssessments
    }
  }
}
```

Restricted to Parent role (`ParentDashboardResolver`). No mutations exist
in GraphQL yet — every write goes through REST.

## What's not documented because it doesn't exist

No OpenAPI/Swagger spec is generated (`@nestjs/swagger` isn't installed).
This document is the API reference until one is added — see
[16_Roadmap.md](16_Roadmap.md).
