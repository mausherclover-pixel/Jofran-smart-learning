import { Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { OpenAiService } from './openai.service';
import { UsageTrackerService } from './cost/usage-tracker.service';
import { promptLibrary } from './prompts/prompt-library';

/**
 * Parent Report Generator (architecture §11). Deliberately the only AI call
 * in the whole nightly report run: the mastery rollup itself
 * (report-generation.processor.ts) is a deterministic aggregation over
 * ProgressRecord — cheap enough to run for every student, every night. Only
 * the human-readable paragraph around those numbers goes through GPT-5 Mini.
 */
@Injectable()
export class ReportNarrativeService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly usage: UsageTrackerService,
  ) {}

  async generate(params: {
    studentId: string;
    studentName: string;
    locale: Locale;
    bySkill: { name: string; mastery: number }[];
    attemptsCompleted: number;
  }): Promise<string> {
    const { system, user } = promptLibrary.reportNarrative(params);
    const result = await this.openAi.chat({ model: this.openAi.modelChat, system, messages: [{ role: 'user', content: user }] });

    await this.usage.log({
      userId: params.studentId,
      feature: 'report-narrative',
      model: this.openAi.modelChat,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    return result.content;
  }
}
