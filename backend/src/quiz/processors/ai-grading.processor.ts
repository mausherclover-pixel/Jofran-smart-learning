import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_AI_GRADING } from '../../common/queue/queue.constants';
import { OpenAiService } from '../../ai/openai.service';
import { UsageTrackerService } from '../../ai/cost/usage-tracker.service';
import { AttemptsService } from '../attempts.service';

interface GradeResponseJob {
  attemptId: string;
  responseId: string;
  questionId: string;
  studentLocale: string;
}

// Consumes the ai-grading queue (architecture §09 / §11): grades one
// constructed-response answer, then finalizes the attempt once every
// response on it has a score.
@Processor(QUEUE_AI_GRADING)
export class AiGradingProcessor extends WorkerHost {
  private readonly logger = new Logger(AiGradingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiService,
    private readonly usage: UsageTrackerService,
    private readonly attempts: AttemptsService,
  ) {
    super();
  }

  async process(job: Job<GradeResponseJob>): Promise<void> {
    const { attemptId, responseId, questionId, studentLocale } = job.data;

    const [response, question] = await Promise.all([
      this.prisma.attemptResponse.findUniqueOrThrow({ where: { id: responseId } }),
      this.prisma.question.findUniqueOrThrow({ where: { id: questionId } }),
    ]);

    const attempt = await this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });

    const result = await this.openAi.gradeConstructedResponse({
      prompt: question.promptMarkdown,
      rubric: question.rubric ?? 'Grade for correctness and effort, appropriate to a Grade 1-6 student.',
      studentAnswer: String(response.answer),
      maxScore: question.points,
      locale: studentLocale,
    });

    await this.usage.log({
      userId: attempt.studentId,
      feature: 'ai-grading',
      model: result.model,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    await this.prisma.attemptResponse.update({
      where: { id: responseId },
      data: { score: result.score, isCorrect: result.isCorrect, aiFeedback: result.feedback },
    });

    const stillPending = await this.prisma.attemptResponse.count({ where: { attemptId, score: null } });
    if (stillPending === 0) {
      await this.attempts.finalize(attemptId);
    }

    this.logger.log(`Graded response ${responseId}: ${result.score}/${question.points}`);
  }
}
