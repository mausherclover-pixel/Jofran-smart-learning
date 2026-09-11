# Jofran Smart Learning — Backend

NestJS + Prisma + PostgreSQL + Redis + BullMQ implementation of the approved
[system architecture](../jofran-architecture.html). REST for auth/CRUD,
GraphQL for composite dashboards, WebSocket for live features — one process,
module boundaries mirroring the domain (§03).

## Getting started

```bash
cp .env.example .env       # add a real OPENAI_API_KEY to exercise the AI module
docker compose up -d          # postgres:5432, redis:6379
npm install
npm run prisma:migrate        # creates the schema
npm run prisma:seed           # demo school, staff, one class, one quiz
npm run start:dev             # http://localhost:4000/v1, GraphQL at /graphql
```

Seeded logins (password `ChangeMe123!` for all, `delfina.s` for the student):

| Role | Identifier |
|---|---|
| Super Admin | `super@jofran.tl` |
| School Admin | `admin@dili-pilot.jofran.tl` |
| Principal | `principal@dili-pilot.jofran.tl` |
| Teacher | `teacher@dili-pilot.jofran.tl` |
| Parent | `parent@dili-pilot.jofran.tl` |
| Student | `delfina.s` (username, not email) |

### Creating your own Super Admin

The seeded `super@jofran.tl` account is demo data, reset every time you
re-run `prisma:seed`. For a real account tied to your own email:

```bash
npm run admin:create -- --email=you@example.com --name="Your Name"
```

Omit `--password` and one is generated and printed once — save it
immediately, it isn't stored anywhere else. Running the command again for
an email that already has an account just ensures the `SUPER_ADMIN` role
and leaves its password alone, unless you pass `--password` explicitly to
change it. See [prisma/create-super-admin.ts](prisma/create-super-admin.ts).

## Module map

| Module | Owns | Architecture ref |
|---|---|---|
| `auth` | Login, refresh rotation, Google/Microsoft OAuth, RBAC guards | §07 |
| `users` | Cross-role profiles | §05 |
| `schools` | School registry (Super Admin) | §05 |
| `students` | Student accounts, enrollment, progress | §05 |
| `parents` | Guardian links, children view | §04 |
| `teachers` | Class roster, grading queue | §04 |
| `academic` | Classes, subjects, curriculum, lessons (locale-scoped, cached) | §06, §10, §13 |
| `quiz` | Assessments, attempts, `ai-grading` worker (Assessment Engine) | §09, §11 |
| `reports` | Progress summaries, nightly cron, `report-generation` worker | §09, §11 |
| `notifications` | Per-locale templates, `notification-fanout` worker, WS gateway | §08, §09, §13 |
| `dashboard` | GraphQL — composite Parent dashboard (example of the REST/GraphQL split) | §03 |
| `ai` | AI Teacher Jojo, RAG, memory, cost tracking, content generation | §11 |

## The AI layer (`src/ai/`)

```
ai/
  openai.service.ts          The only place that calls OpenAI — chat, TTS, transcribe, moderation
  config/model-pricing.ts    $/1M-token table → AiUsageLog.estimatedCostUsd
  prompts/prompt-library.ts  Every system prompt in the app, in one file — child-safety rules live once
  memory/                    ConversationMemoryService — sliding window + rolling summary
  rag/retrieval.service.ts   Curriculum search behind Jojo's answers
  cost/                      UsageTrackerService (logs every call), RateLimiterService (daily quota)
  jojo/                      JojoController + JojoService — chat, listen (TTS), speak (transcribe)
  content/                   StoryGeneratorService, QuizGeneratorService — teacher-facing drafts
  report-narrative.service.ts  Parent Report Generator, called from reports/processors
```

### Endpoints this module adds

| Route | Role | What it does |
|---|---|---|
| `POST /ai/jojo/conversations` | Student | Starts a conversation, optionally scoped to a lesson |
| `POST /ai/jojo/conversations/:id/messages` | Student | One chat turn — moderation → retrieval → memory → reply |
| `GET /ai/jojo/conversations/:id` | Student (own) · Parent (child) · Teacher (their student) · school-wide roles | Full transcript — the transparency rule from §11 |
| `POST /ai/jojo/listen` | Student | Text → speech (`audio/mpeg` response body) |
| `POST /ai/jojo/speak` | Student | Speech → text, multipart `audio` field, optional `targetPhrase` for pronunciation feedback |
| `POST /ai/content/story` | Teacher/Admin | Story Generator — cached per (grade, subject, locale, theme) |
| `POST /ai/content/quiz-draft` | Teacher/Admin | Quiz Generator — draft questions from a lesson; never auto-published |

### Design decisions worth knowing about

**RAG is full-text search, not embeddings.** `RetrievalService` uses
Postgres' native `tsvector`/`ts_rank` over `lesson_locales`, not a
`pgvector` + embeddings pipeline. At Jofran's scale — hundreds of curated
lessons, not millions of documents — keyword retrieval finds the right
lesson reliably, needs no new datastore or extension, and stays searchable
the instant a lesson is edited (no re-indexing job to keep in sync). This
also matches the architecture's own principle (§01): boring, operable
infrastructure over cleverness. If the curriculum corpus grows enough that
recall becomes the bottleneck, the upgrade path is a `LessonEmbedding` table
plus `pgvector` — `RetrievalService.search()`'s signature wouldn't need to
change, only its implementation.

**Memory is a window + a rolling summary, not unbounded history.**
`ConversationMemoryService` sends the last `JOJO_CONTEXT_WINDOW_TURNS`
messages verbatim and folds everything older into `AiConversation.summary`
via a cheap model call. Nothing is deleted from `AiMessage` — a teacher or
guardian reading `GET /ai/jojo/conversations/:id` still sees the full
transcript; only what gets *replayed to the model* shrinks.

**Every OpenAI call reports to `AiUsageLog`.** Grading, chat, TTS,
transcription, story/quiz generation, and report narratives all call
`UsageTrackerService.log()`. `MODEL_PRICING` in `config/model-pricing.ts` is
an illustrative rate table, not live OpenAI pricing — update it before
trusting `estimatedCostUsd` for a real budget conversation.

**Moderation runs before generation, not after.** `JojoService.sendMessage`
calls OpenAI's moderation endpoint on the student's message before it ever
reaches a chat prompt — cheaper than a full completion, and it means a
flagged message never becomes model input at all.

## What's stubbed, deliberately

- **Email/SMS delivery** (`notification-fanout` processor) logs instead of
  calling a real provider — no SES/Twilio account was in scope.
- **Report PDF rendering** — `ProgressReport.narrative` (the AI-written
  paragraph) and `.summary` (the deterministic numbers) both exist; turning
  them into a PDF under `certificates/` is a Media/Storage concern.
- **S3 signed uploads** aren't wired — `LessonLocale.mediaKeys` and the
  SPEAKING question type assume object keys a MediaModule will issue.
- **Story/Quiz Generator output isn't auto-saved** — both return a draft the
  caller (frontend) is responsible for showing to a teacher for edits before
  it becomes a real `Lesson` or `Assessment`.

These are marked `TODO` in code at the exact call site where they plug in.

## Next steps (per the project roadmap)

5. **Developer Pack** — paste the full PRD as reference context for
   deeper feature work: Messaging module, S3/MediaModule, manual grade
   override, PDF report rendering.
