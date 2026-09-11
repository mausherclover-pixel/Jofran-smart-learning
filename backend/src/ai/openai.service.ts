import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

export interface ChatResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface GradingResult {
  score: number; // 0..maxScore
  isCorrect: boolean;
  feedback: string; // in the student's locale
}

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

export interface AudioFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

/**
 * The one place the app talks to OpenAI. Every feature in the AI layer
 * (Jojo chat, grading, TTS, transcription, content generation) goes through
 * here — model selection lives in each caller (architecture §11's routing
 * table), not in this class; this class just knows how to make the calls
 * and hand back a shape the rest of the app can log and act on.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI;

  readonly modelChat: string;
  readonly modelReasoning: string;
  readonly modelTts: string;
  readonly modelTranscribe: string;
  readonly modelModeration: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({ apiKey: config.get<string>('ai.apiKey') });
    this.modelChat = config.get<string>('ai.modelChat')!;
    this.modelReasoning = config.get<string>('ai.modelReasoning')!;
    this.modelTts = config.get<string>('ai.modelTts')!;
    this.modelTranscribe = config.get<string>('ai.modelTranscribe')!;
    this.modelModeration = config.get<string>('ai.modelModeration')!;
  }

  /** Generic chat completion — every text feature (Jojo, story/quiz generation, report narratives) calls this. */
  async chat(params: {
    model: string;
    system: string;
    messages: { role: 'user' | 'assistant'; content: string }[];
    jsonMode?: boolean;
    maxOutputTokens?: number;
  }): Promise<ChatResult> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      response_format: params.jsonMode ? { type: 'json_object' } : undefined,
      max_completion_tokens: params.maxOutputTokens,
      messages: [{ role: 'system', content: params.system }, ...params.messages],
    });

    return {
      content: response.choices[0]?.message?.content ?? '',
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  /**
   * Grades a constructed-response answer against a rubric. Runs on
   * GPT-5 Mini first; a low-confidence result is re-graded on GPT-5 before a
   * teacher ever sees it (architecture §11 — the Assessment Engine).
   */
  async gradeConstructedResponse(params: {
    prompt: string;
    rubric: string;
    studentAnswer: string;
    maxScore: number;
    locale: string;
  }): Promise<GradingResult & { model: string; usage: ChatResult['usage'] }> {
    const system = [
      "You are grading a Grade 1-6 student's answer for the Jofran Smart Learning platform.",
      `Respond ONLY in this locale: ${params.locale} (tet=Tetum, en=English, id=Bahasa Indonesia).`,
      'Be encouraging and age-appropriate. Return strict JSON: {"score": number, "isCorrect": boolean, "feedback": string, "confidence": number}.',
      `Max score: ${params.maxScore}. Confidence is 0..1 — how sure you are the score is fair.`,
    ].join(' ');
    const user = [`Question: ${params.prompt}`, `Rubric: ${params.rubric}`, `Student answer: ${params.studentAnswer}`].join(
      '\n',
    );

    const first = await this.chat({ model: this.modelChat, system, messages: [{ role: 'user', content: user }], jsonMode: true });
    const parsedFirst = this.parseGrading(first.content, params.maxScore);
    if (parsedFirst.confidence >= 0.7) {
      return { ...parsedFirst, model: this.modelChat, usage: first.usage };
    }

    this.logger.log(`Escalating low-confidence grade (${parsedFirst.confidence}) to ${this.modelReasoning}`);
    const second = await this.chat({ model: this.modelReasoning, system, messages: [{ role: 'user', content: user }], jsonMode: true });
    return { ...this.parseGrading(second.content, params.maxScore), model: this.modelReasoning, usage: second.usage };
  }

  /** Listening Assistant: renders text as speech in the student's locale (architecture §11). */
  async textToSpeech(text: string, voice: string = 'alloy'): Promise<{ audio: Buffer; mimeType: string }> {
    const response = await this.client.audio.speech.create({ model: this.modelTts, voice: voice as any, input: text });
    return { audio: Buffer.from(await response.arrayBuffer()), mimeType: 'audio/mpeg' };
  }

  /** Speaking Assistant: transcribes a student's spoken answer for pronunciation/fluency practice (architecture §11). */
  async transcribeAudio(file: AudioFile): Promise<{ text: string }> {
    const upload = await toFile(file.buffer, file.filename, { type: file.mimetype });
    const response = await this.client.audio.transcriptions.create({ file: upload, model: this.modelTranscribe });
    return { text: response.text };
  }

  /** Screens a student's message before it ever reaches a chat prompt — cheaper and safer than relying on the model to refuse. */
  async moderateText(text: string): Promise<ModerationResult> {
    const response = await this.client.moderations.create({ model: this.modelModeration, input: text });
    const result = response.results[0];
    return {
      flagged: result?.flagged ?? false,
      categories: Object.entries(result?.categories ?? {})
        .filter(([, v]) => v)
        .map(([k]) => k),
    };
  }

  private parseGrading(raw: string, maxScore: number): GradingResult & { confidence: number } {
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw || '{}');
    } catch {
      this.logger.warn('Grading response was not valid JSON — defaulting to a zero score for teacher review');
    }
    return {
      score: Math.min(parsed.score ?? 0, maxScore),
      isCorrect: parsed.isCorrect ?? false,
      feedback: parsed.feedback ?? '',
      confidence: parsed.confidence ?? 1,
    };
  }
}
