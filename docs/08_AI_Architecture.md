# 08 — AI Architecture

Source: [backend/src/ai/](../backend/src/ai), see also
[backend/README.md](../backend/README.md#the-ai-layer-srcai)'s file map.

## AI Teacher Jojo — one persona, several capabilities

Jojo is the single character a student ever talks to. "Reading Assistant,"
"Writing Assistant," "Listening Assistant," and "Speaking Assistant" from
the original brief are not four separate bots — they're four capabilities
routed through one `JojoService`:

| Capability | Backend surface | Model |
|---|---|---|
| Reading / Writing (chat) | `POST /ai/jojo/conversations/:id/messages` | GPT-5 Mini, escalates on low confidence |
| Listening | `POST /ai/jojo/listen` | GPT-4o Mini TTS |
| Speaking | `POST /ai/jojo/speak` | GPT-4o Transcribe + a short GPT-5 Mini feedback call |
| Adaptive Learning | `AttemptsService.updateMastery` (quiz module) | No LLM call — deterministic EWMA |
| Assessment Engine | `ai-grading` queue | GPT-5 Mini → GPT-5 escalation |
| Story Generator | `POST /ai/content/story` | GPT-5, cached |
| Quiz Generator | `POST /ai/content/quiz-draft` | GPT-5, draft only |
| Parent Report Generator | `report-generation` queue | GPT-5 Mini |

## The chat loop, end to end

```
Student message
  → RateLimiterService.assertJojoQuota   (Redis, per-student daily cap)
  → OpenAiService.moderateText            (reject before it ever reaches a prompt)
  → ConversationMemoryService.getContext  (rolling summary + last N turns)
  → RetrievalService.search               (full-text search over published lessons)
  → promptLibrary.jojoSystem              (assembles system prompt: locale, grade, lesson, retrieved context, memory)
  → OpenAiService.chat                    (GPT-5 Mini)
  → UsageTrackerService.log               (AiUsageLog row)
  → persist both turns to AiMessage       (never deleted)
  → ConversationMemoryService.maybeSummarize
```

## RAG: full-text search, not embeddings — and why

`RetrievalService` (`src/ai/rag/retrieval.service.ts`) runs Postgres
`ts_rank`/`plainto_tsquery` over `lesson_locales.bodyMarkdown`, computed at
query time — no `pgvector`, no embeddings pipeline, no new datastore.

This was a deliberate call, not a shortcut:

- The corpus is curated curriculum content — hundreds of lessons at launch,
  not millions of documents — where keyword retrieval already finds the
  right lesson reliably.
- A lesson is searchable the instant `CurriculumService.upsertLessonLocale`
  commits — no re-indexing job to keep in sync with edits.
- It matches the architecture's own stated principle: boring, operable
  infrastructure for a small team, over cleverness.

**Upgrade path**, if the corpus grows large enough that recall becomes the
bottleneck: add a `LessonEmbedding` table and switch to `pgvector` cosine
search. `RetrievalService.search()`'s public signature wouldn't need to
change — only its implementation.

## Memory: window + rolling summary

`ConversationMemoryService` sends the last `JOJO_CONTEXT_WINDOW_TURNS`
(default 8) messages verbatim. Anything older is folded into
`AiConversation.summary` via one cheap GPT-5 Mini call, triggered right
after a reply is persisted. **Nothing is deleted from `AiMessage`** — a
teacher or guardian reading the full transcript via `GET
/ai/jojo/conversations/:id` always sees everything; only what gets
*replayed to the model* on the next turn shrinks.

## Cost optimization

- **Model routing table** (above) — cheap model first, escalate only on
  low self-reported confidence (grading) or for genuinely low-volume,
  quality-sensitive generation (stories, quiz drafts).
- **`AiUsageLog`** — every call, every feature, logs `promptTokens`,
  `completionTokens`, and an `estimatedCostUsd` computed from
  `config/model-pricing.ts`. That table is illustrative pricing, not live
  OpenAI rates — update it before trusting a real budget number.
- **Caching** — Story Generator output is cached in Redis per `(grade,
  subject, locale, theme)` for 30 days; it's generated once per unit, not
  once per student.
- **Rate limiting** — `RateLimiterService` caps Jojo chat at 60 messages
  per student per day (configurable via `JOJO_DAILY_MESSAGE_LIMIT`).
- **Moderation before generation** — a flagged message never reaches a
  paid completion call at all.

## Safety guardrails

- `promptLibrary`'s `SAFETY_RULES` are defined once and included in every
  prompt that talks to a student — not repeated (and potentially
  drifted) per feature.
- Every Jojo conversation is logged and visible to that student's teacher
  and linked guardian(s) — a transparency feature, not surveillance.
- A flagged message gets a locale-appropriate refusal
  (`REFUSAL` map in `jojo.service.ts`) instead of being sent to the model at all.

## What isn't built yet

- Retry/backoff on OpenAI API errors (a transient 5xx from OpenAI currently
  surfaces as a failed request, not a retried one).
- Streaming responses (Jojo's reply arrives as one completed message, not
  token-by-token).
- A cost dashboard UI — `UsageTrackerService.summarizeByFeature()` exists
  as a query method but has no controller/frontend page exposing it yet.
