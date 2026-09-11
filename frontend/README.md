# Jofran Smart Learning — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + Zustand +
Recharts + Framer Motion, wired against the [backend API](../backend). Brand:
Primary `#062D89`, Secondary `#0C6EFF`, Accent `#11D5E8`.

## Getting started

The [backend](../backend) must be running first (`npm run start:dev` there, on `:4000`).

```bash
cp .env.local.example .env.local
npm install
npm run dev            # http://localhost:3000
```

Log in with any seeded account from the backend README (e.g. `teacher@dili-pilot.jofran.tl` / `ChangeMe123!`).

## Structure

```
src/
  app/
    page.tsx                    Landing page (public)
    (auth)/login/               Login — password + Google/Microsoft OAuth
    (app)/                      Everything behind AppShell's auth guard
      student/                  Student Dashboard, My progress (Report page)
      parent/                   Parent Dashboard (GraphQL) + child progress
      teacher/                  Teacher Dashboard, class roster, new assessment
      principal/                Principal Dashboard (also used by School Admin)
      admin/                    Super Admin — schools list
      learn/[lessonId]/         Learning page — renders a lesson in the student's locale
      quiz/[assessmentId]/      Quiz-taking flow — start, answer, submit
  components/
    ui/                         Hand-written shadcn/ui primitives (button, card, tabs, …)
    nav/                        Role-aware sidebar (AppShell, NAV_ITEMS)
    charts/                     Recharts wrapper (MasteryChart)
    landing/                    Framer Motion reveal for the landing hero
  lib/
    api-client.ts               REST fetch wrapper — attaches the access token, retries once on 401 via refresh
    graphql-client.ts           Minimal GraphQL fetcher for parentDashboard
    auth.ts                     login / logout / bootstrapSession
    api/                        One file per backend module (students, teachers, parents, reports, admin, curriculum)
  store/auth-store.ts           Zustand — user + in-memory access token
```

## How auth actually works here

- The **access token** never touches `localStorage` — it lives in memory and
  `sessionStorage` only (via Zustand's `persist`), so it doesn't survive an
  XSS payload reading disk-backed storage indefinitely.
- The **refresh token** is the backend's httpOnly cookie; this app never
  reads it, only relies on the browser sending it automatically to
  `/auth/refresh`.
- `bootstrapSession()` runs once on load (`app/providers.tsx`) and silently
  exchanges that cookie for a fresh access token — that's what makes a page
  reload not force a re-login.
- Route protection is **client-side only** (`AppShell` redirects to `/login`
  if unauthenticated). There's no Next.js middleware doing this at the edge,
  because that would need the middleware itself to call the API — a
  reasonable Phase 1 simplification, not an oversight.

## AI Teacher Jojo (Step 4)

`student/jojo/page.tsx` is a real chat client against `/ai/jojo/conversations`
— it starts a conversation on mount, posts each message, and renders Jojo's
reply. It does not yet use the Listening (`/ai/jojo/listen`, returns an MP3)
or Speaking (`/ai/jojo/speak`, multipart audio upload) endpoints — those need
a microphone/audio-player UI that's a reasonable next increment, not a
backend gap.

## What's stubbed, deliberately

- **Messaging** (teacher–parent threads) has Prisma models in the backend
  schema but no service/controller — Step 2's module list didn't include a
  Messaging module, so there's nothing here to call yet.
- **Manual grade override** for a teacher isn't wired: the grading queue on
  the Teacher Dashboard is read-only ("Jojo is grading…") because the
  backend has no endpoint for a teacher to overwrite an AI-assigned score.
- **Story/Quiz Generator UI** — the backend's `/ai/content/story` and
  `/ai/content/quiz-draft` endpoints exist (Step 4) but have no teacher-facing
  form here yet; the quiz-generator's output is shaped to slot directly into
  the existing "New assessment" form's question list once wired.
- A submitted quiz attempt can't be resumed — refreshing mid-quiz starts a
  new `Attempt` row, because `POST /attempts/:id/start` always creates one.

Each of these is a small, well-scoped addition away — flagged here rather
than faked in the UI.
