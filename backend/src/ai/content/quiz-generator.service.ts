import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from '../openai.service';
import { UsageTrackerService } from '../cost/usage-tracker.service';
import { promptLibrary } from '../prompts/prompt-library';

export interface DraftQuestion {
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'CONSTRUCTED_RESPONSE';
  promptMarkdown: string;
  choices?: { id: string; label: string }[];
  correctAnswer?: unknown;
  points: number;
}

/**
 * Drafts questions from a lesson's own content. Returns a DRAFT only — it
 * never calls AssessmentsService.create itself. A teacher reviews and edits
 * in the frontend's assessment builder, then submits it through the normal
 * `POST /assessments` flow; nothing this service produces reaches a student
 * unreviewed (architecture §11's "never auto-published" rule applies to
 * generated assessments exactly as it does to generated lesson content).
 */
@Injectable()
export class QuizGeneratorService {
  private readonly logger = new Logger(QuizGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiService,
    private readonly usage: UsageTrackerService,
  ) {}

  async draftFromLesson(lessonId: string, questionCount: number, requestedBy: string): Promise<DraftQuestion[]> {
    const lesson = await this.prisma.lesson.findUniqueOrThrow({
      where: { id: lessonId },
      include: { variants: true },
    });

    const variant = lesson.variants[0];
    if (!variant) throw new Error('Lesson has no content to draft questions from');

    const { system, user } = promptLibrary.quizGenerator({
      lessonTitle: variant.title,
      lessonBody: variant.bodyMarkdown,
      locale: variant.locale,
      questionCount,
    });

    const result = await this.openAi.chat({
      model: this.openAi.modelReasoning,
      system,
      messages: [{ role: 'user', content: user }],
      jsonMode: true,
    });

    await this.usage.log({
      userId: requestedBy,
      feature: 'quiz-generator',
      model: this.openAi.modelReasoning,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    try {
      const parsed = JSON.parse(result.content);
      return parsed.questions ?? [];
    } catch {
      this.logger.warn('Quiz generator returned invalid JSON — returning no draft questions');
      return [];
    }
  }
}
