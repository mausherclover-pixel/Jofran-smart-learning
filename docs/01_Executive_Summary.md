# 01 — Executive Summary

## What Jofran Smart Learning is

Jofran Smart Learning is an AI-powered learning platform for Grade 1–6
students in Timor-Leste, connecting six roles — Student, Parent, Teacher,
Principal, School Administrator, Super Administrator — in one system.
Content and interaction are delivered in three languages as peers, not one
translated afterthought: **Tetum, English, and Bahasa Indonesia**.

## The problem

Timor-Leste's primary schools have no shared digital platform connecting
what a student does in class to what a parent can see at home, or what a
teacher can act on across a class. Progress tracking is paper-based or
absent; feedback to a struggling student is delayed by days or weeks; and
existing EdTech products are built for markets where English is the
default and connectivity is assumed — neither holds for Timor-Leste.

## The approach

- **One account model, six roles, one `schoolId` boundary.** Every role
  except Super Administrator is confined to exactly one school's data,
  enforced at the guard layer, not left to a controller to remember (see
  [03_System_Architecture.md](03_System_Architecture.md)).
- **AI Teacher Jojo** — one AI persona covering reading, writing, listening
  and speaking practice, adaptive difficulty, and grading — every
  conversation logged and visible to a guardian and teacher, never private
  (see [08_AI_Architecture.md](08_AI_Architecture.md)).
- **Trilingual by construction.** Every content model carries locale
  variants as database rows, not a JSON blob with an English default.
- **Boring, operable infrastructure.** Managed AWS services, a modular
  monolith instead of microservices, Postgres full-text search instead of a
  new vector database — choices sized for a two- or three-person
  engineering team, not a unicorn's platform team.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Recharts, Framer Motion |
| Backend | NestJS, PostgreSQL, Prisma ORM, Redis, BullMQ, GraphQL + REST, WebSocket |
| Auth | JWT (15 min access, rotating refresh), Google OAuth2, Microsoft OAuth2 |
| AI | OpenAI — GPT-5, GPT-5 Mini, GPT-4o Mini TTS, GPT-4o Transcribe |
| Infrastructure | AWS (ap-southeast-1), Docker Compose for local dev |

## Build status (as of this document)

| Step | Scope | Status |
|---|---|---|
| 1 | System architecture | ✅ Complete — [jofran-architecture.html](../jofran-architecture.html) |
| 2 | Backend implementation | ✅ Complete — [backend/](../backend), 77 source files, builds and boots clean |
| 3 | Frontend implementation | ✅ Complete — [frontend/](../frontend), 15 routes, builds clean |
| 4 | AI architecture (Jojo) | ✅ Complete — RAG, memory, cost tracking, TTS/Transcribe wired end-to-end |
| 5 | Developer Pack | 🟡 This document set — written from the completed build, not aspirational |

Every backend and frontend claim in this Developer Pack has been verified
by an actual `npm install` → typecheck → build → boot pass, not just
written and assumed correct — see each module's README for the exact
commands.

## What's explicitly out of scope so far

Messaging (teacher–parent threads), S3 media uploads, PDF report rendering,
gamification award logic, and manual grade override are designed (schema
and/or architecture exist) but not yet implemented. Each is flagged with a
`TODO` at its exact call site in code, and listed again in
[16_Roadmap.md](16_Roadmap.md).
