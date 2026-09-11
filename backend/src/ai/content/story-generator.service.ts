import { Inject, Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { OpenAiService } from '../openai.service';
import { UsageTrackerService } from '../cost/usage-tracker.service';
import { promptLibrary } from '../prompts/prompt-library';

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface StoryRequest {
  grade: number;
  subjectSlug: string;
  locale: Locale;
  theme: string;
}

/**
 * Generated once per (grade, subject, locale, theme) and cached — not once
 * per student (architecture §11's cost-optimization example). GPT-5, not
 * GPT-5 Mini: this is low-volume, quality-sensitive content a teacher will
 * read before ever showing a class.
 */
@Injectable()
export class StoryGeneratorService {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly usage: UsageTrackerService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async generate(request: StoryRequest, requestedBy: string): Promise<{ story: string; cached: boolean }> {
    const cacheKey = this.cacheKey(request);
    const cached = await this.redis.get(cacheKey);
    if (cached) return { story: cached, cached: true };

    const { system, user } = promptLibrary.storyGenerator(request);
    const result = await this.openAi.chat({ model: this.openAi.modelReasoning, system, messages: [{ role: 'user', content: user }] });

    await this.usage.log({
      userId: requestedBy,
      feature: 'story-generator',
      model: this.openAi.modelReasoning,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    await this.redis.set(cacheKey, result.content, 'EX', CACHE_TTL_SECONDS);
    return { story: result.content, cached: false };
  }

  private cacheKey(r: StoryRequest): string {
    const hash = createHash('sha1').update(`${r.grade}:${r.subjectSlug}:${r.locale}:${r.theme}`).digest('hex').slice(0, 12);
    return `ai:story:${hash}`;
  }
}
