# 10 — Learning Engine

Source: [backend/src/quiz/attempts.service.ts](../backend/src/quiz/attempts.service.ts),
[backend/src/quiz/processors/ai-grading.processor.ts](../backend/src/quiz/processors/ai-grading.processor.ts).

## The mastery model

One number per `(studentId, skillId)` — `ProgressRecord.mastery`, a float in
`[0, 1]` — updated by an **exponentially weighted moving average (EWMA)**
every time a question tagged with that skill is scored:

```ts
const correctness = score / question.points;           // 0..1 for this one attempt
const nextMastery = existing
  ? MASTERY_EWMA_ALPHA * correctness + (1 - MASTERY_EWMA_ALPHA) * existing.mastery
  : correctness;                                        // first attempt at this skill
```

`MASTERY_EWMA_ALPHA = 0.3` — the newest attempt gets 30% weight, prior
mastery keeps 70%. This means mastery moves meaningfully after 2–3 attempts
at a skill but isn't wiped out by one lucky guess or one bad day.

## Skill taxonomy

`Subject` (e.g. `math-grade3`) → `Skill` (e.g. `add-2digit`, "Two-digit
addition") → `Question.skillId`. A question not tagged with a skill (rare —
mostly reserved for pure comprehension checks) doesn't feed the mastery
model at all; it's still graded, just doesn't move any `ProgressRecord`.

## Attempt lifecycle

```
IN_PROGRESS  → student starts (POST /attempts/:assessmentId/start)
             → student submits answers one at a time (POST /attempts/:id/answers)
             → multiple-choice grades synchronously right there
SUBMITTED    → student finalizes (POST /attempts/:id/submit)
             → constructed-response questions with no score yet enqueue onto ai-grading
GRADING      → (only reached if constructed-response questions are pending)
GRADED       → every response has a score; AttemptsService.finalize() runs:
                 - sums total score
                 - sets gradedBy: AI if any response has aiFeedback, else AUTO
                 - updates ProgressRecord for every skill touched
```

`AiGradingProcessor` calls `AttemptsService.finalize()` itself once the
*last* pending response on an attempt gets its AI-assigned score — the
student doesn't need to poll; the attempt transitions to `GRADED`
automatically the moment grading finishes.

## Question types and how each is scored

| Type | Scored by | Notes |
|---|---|---|
| `MULTIPLE_CHOICE` | Synchronous, exact match against `Question.correctAnswer` | No AI call |
| `SHORT_ANSWER` | Routed to `ai-grading` like constructed-response | Same path, shorter expected answers |
| `CONSTRUCTED_RESPONSE` | `ai-grading` queue → GPT-5 Mini, escalates to GPT-5 on low confidence | Rubric comes from `Question.rubric` |
| `SPEAKING` | Schema exists (`QuestionType.SPEAKING`); no grading path wired to it yet — the Speaking Assistant's transcribe+feedback flow (`JojoService.speak`) is a separate, ungated practice tool, not yet connected to a scored `Attempt` | See [16_Roadmap.md](16_Roadmap.md) |

## Adaptive difficulty: where it actually happens

**Important distinction:** there is no separate "next question selector"
service in the current build. The mastery score is *computed and stored*
(above), and the architecture (§11) specifies it should bias which
questions a student sees next — but the question-selection logic itself
(reading `ProgressRecord` to pick which skills to serve more or fewer
questions from) is not yet implemented. Today, `AssessmentsService` serves
whatever questions a teacher put on an `Assessment`, in the order authored.

This is the single largest gap between the architecture's adaptive-learning
diagram and the current code — flagged explicitly rather than left
implicit. See [16_Roadmap.md](16_Roadmap.md) for what building it requires:
a query over `ProgressRecord` filtered to below-threshold skills, and a
question-bank concept (today, questions belong to one fixed `Assessment`,
not a pool a selector can draw from).

## What is fully working

- Per-skill mastery tracking (EWMA)
- Auto-grading (multiple-choice) and AI-grading (constructed-response) with
  confidence-based model escalation
- Progress visible to the student, their guardians, and their teacher via
  the same `ProgressRecord` query, at different scope
