# 09 — OpenAI Integration

Source: [backend/src/ai/openai.service.ts](../backend/src/ai/openai.service.ts).
This is the **only** file in the codebase that imports the `openai` npm
package — every other AI-related service calls through it.

## Configuration

Environment variables (`backend/.env.example`):

```bash
OPENAI_API_KEY=
OPENAI_MODEL_CHAT=gpt-5-mini
OPENAI_MODEL_REASONING=gpt-5
OPENAI_MODEL_TTS=gpt-4o-mini-tts
OPENAI_MODEL_TRANSCRIBE=gpt-4o-transcribe
OPENAI_MODEL_MODERATION=omni-moderation-latest
JOJO_DAILY_MESSAGE_LIMIT=60
JOJO_CONTEXT_WINDOW_TURNS=8
```

All model ids are configurable per environment without a code change —
`OpenAiService`'s constructor reads them via `ConfigService`, so swapping a
model (e.g. testing a new GPT-5 variant) is a deploy-config change, not a
release.

## `OpenAiService` public methods

```ts
chat(params: {
  model: string;
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  jsonMode?: boolean;
  maxOutputTokens?: number;
}): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }>

gradeConstructedResponse(params: {
  prompt: string; rubric: string; studentAnswer: string; maxScore: number; locale: string;
}): Promise<GradingResult & { model: string; usage: ... }>
// Runs on modelChat first; escalates to modelReasoning if confidence < 0.7.

textToSpeech(text: string, voice?: string): Promise<{ audio: Buffer; mimeType: string }>
transcribeAudio(file: { buffer: Buffer; filename: string; mimetype: string }): Promise<{ text: string }>
moderateText(text: string): Promise<{ flagged: boolean; categories: string[] }>
```

Every other AI service (`JojoService`, `StoryGeneratorService`,
`QuizGeneratorService`, `ReportNarrativeService`,
`AiGradingProcessor`) calls one of these — none construct their own
`OpenAI` client instance.

## Request/response shapes actually used

- **Chat completions** — `client.chat.completions.create`, with
  `response_format: { type: 'json_object' }` when `jsonMode: true`
  (grading, quiz drafting both parse strict JSON back out).
- **TTS** — `client.audio.speech.create({ model, voice, input })`, response
  read via `.arrayBuffer()` into a `Buffer`; served back to the client as
  `audio/mpeg` directly from `JojoController.listen` (no S3 round-trip —
  see caveat below).
- **Transcription** — `client.audio.transcriptions.create({ file, model })`,
  where `file` is wrapped via `toFile()` from the `openai` package around
  the raw `Buffer` multer hands the controller.
- **Moderation** — `client.moderations.create({ model, input })`, called
  before every Jojo chat turn.

## Error handling (current state)

No retry/backoff wrapper exists yet — an OpenAI request that throws
(network error, rate limit, 5xx) propagates as an unhandled rejection up to
NestJS's default exception handling: a REST caller gets a 500, a BullMQ job
(`ai-grading`, `report-generation`) is retried per BullMQ's own default
backoff policy (job-level, not call-level). A dedicated retry policy
(exponential backoff on 429/5xx, no retry on 4xx) is the highest-value
addition to this file — see [16_Roadmap.md](16_Roadmap.md).

## Cost tracking hook

Every method that spends tokens returns a `usage` object; the *caller* is
responsible for logging it via `UsageTrackerService.log()` — `OpenAiService`
itself never writes to the database, keeping it a pure integration layer.
This is why `gradeConstructedResponse`'s caller
(`AiGradingProcessor`) and `JojoService.sendMessage` both have their own
explicit `usage.log(...)` calls rather than the logging happening inside
`OpenAiService`.

## Known limitation: audio isn't cached or stored

`textToSpeech` returns raw bytes straight through to the HTTP response —
repeated requests for the same text re-synthesize every time, and nothing
is written to S3. This is fine for Jojo's live chat replies (each is
unique) but wasteful for anything repeated (e.g. a standard lesson
instruction spoken aloud every time a student opens it). Once
S3/MediaModule exists, TTS output for static text should be cached there
under a content hash — same pattern as the Story Generator's Redis cache,
one layer further downstream.
