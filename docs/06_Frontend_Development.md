# 06 — Frontend Development

Source: [frontend/](../frontend), see also [frontend/README.md](../frontend/README.md)
for setup commands. Verified: `npm install` → `tsc --noEmit` → `next build`
all clean, 15 routes generated, boot-tested against the actual running dev
server with a browser screenshot check.

## Route map

```
app/
  page.tsx                              Landing (public)
  (auth)/login/page.tsx                 Login — password + Google/Microsoft OAuth
  (app)/                                Everything behind AppShell's auth guard
    student/page.tsx                    Student Dashboard
    student/jojo/page.tsx               Jojo chat client
    student/reports/page.tsx            Student's own progress reports
    parent/page.tsx                     Parent Dashboard (GraphQL)
    parent/children/[studentId]/progress/page.tsx
    teacher/page.tsx                    Teacher Dashboard + grading queue
    teacher/classes/[classId]/page.tsx  Class roster
    teacher/classes/[classId]/assessments/new/page.tsx
    principal/page.tsx                  School overview
    admin/page.tsx                      Super Admin — schools list
    learn/[lessonId]/page.tsx           Lesson content, locale-aware
    quiz/[assessmentId]/page.tsx        Quiz-taking flow (start → answer → submit)
```

## State management

**Zustand**, one store (`store/auth-store.ts`): `user`, `accessToken`,
`status`. The access token is deliberately kept out of `localStorage` —
memory plus `sessionStorage` only (via `persist`'s custom storage adapter)
— so it doesn't sit readable-forever if an XSS payload ever reads disk-backed
storage. No other global client state exists; every dashboard fetches its
own data via `useApiData` and holds it locally.

## Data fetching pattern

`hooks/use-api-data.ts` — a ~30-line fetch-on-mount hook (loading/error/data
+ `refetch`), used by every page instead of a full library like React Query
or SWR. Justification: one query per page, refetched on dependency change,
is everything these screens need today; adding a caching/invalidation
library before there's a caching problem would be premature.

## API client layer

- `lib/api-client.ts` — REST fetch wrapper. Attaches the in-memory access
  token as `Authorization: Bearer`, and on a `401` calls `/auth/refresh`
  once (via the httpOnly cookie) and retries — mirroring the backend's own
  refresh-rotation design.
- `lib/graphql-client.ts` — a ~20-line POST-to-`/graphql` fetcher, used only
  by `lib/api/parents.ts`'s `parentDashboard` query. No Apollo Client; one
  query doesn't justify one.
- `lib/api/*.ts` — one file per backend module (`students.ts`, `teachers.ts`,
  `assessments.ts`, `jojo.ts`, etc.), each a thin typed wrapper over `api.get/post/patch`.

## Auth flow (client side)

1. `app/providers.tsx` calls `bootstrapSession()` once on mount — silently
   exchanges the refresh cookie for a fresh access token, so a page reload
   doesn't force a re-login.
2. `AppShell` redirects to `/login` if `status === 'unauthenticated'` after
   bootstrap resolves.
3. Route protection is **client-side only** — no Next.js middleware, because
   that would need the edge middleware itself to call the API. A deliberate
   Phase 1 simplification (documented in `frontend/README.md`), not an
   oversight.

## Forms and validation

No form library (React Hook Form, Formik) — every form so far
(login, new-assessment builder) is small enough for plain `useState` plus
native `required`/`type` HTML validation, backed by the backend's
`class-validator` DTOs as the actual source of truth for validity.

## Build & verification commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # next build — must produce zero errors before shipping a page
npm run dev          # local dev server, http://localhost:3000
```

## Known gaps (see frontend/README.md for the full list)

- No Listening/Speaking Assistant UI yet (backend endpoints exist —
  `/ai/jojo/listen`, `/ai/jojo/speak` — but need a microphone/audio-player
  component).
- No teacher-facing UI for the Story/Quiz Generator endpoints.
- A submitted quiz attempt can't be resumed after a page refresh.
