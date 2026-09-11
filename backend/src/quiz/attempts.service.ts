import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AttemptStatus, GradedBy, QuestionType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { QUEUE_AI_GRADING } from '../common/queue/queue.constants';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { computeCorrectness, nextMastery } from './mastery.util';

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_AI_GRADING) private readonly aiGradingQueue: Queue,
  ) {}

  async start(ctx: AuthContext, assessmentId: string) {
    const assessment = await this.prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
    const enrolled = await this.prisma.enrollment.findFirst({
      where: { classId: assessment.classId, studentId: ctx.userId },
    });
    if (!enrolled) throw new ForbiddenException('You are not enrolled in this class');

    return this.prisma.attempt.create({
      data: { assessmentId, studentId: ctx.userId, maxScore: await this.maxScore(assessmentId) },
    });
  }

  async submitAnswer(ctx: AuthContext, attemptId: string, dto: SubmitAnswerDto) {
    const attempt = await this.ownAttempt(ctx, attemptId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt is no longer accepting answers');
    }

    const question = await this.prisma.question.findUniqueOrThrow({ where: { id: dto.questionId } });

    // Multiple-choice grades synchronously — no round trip through the queue.
    const isAutoGradable = question.type === QuestionType.MULTIPLE_CHOICE;
    const isCorrect = isAutoGradable ? this.isChoiceCorrect(question.correctAnswer, dto.answer) : null;
    const score = isAutoGradable ? (isCorrect ? question.points : 0) : null;

    return this.prisma.attemptResponse.upsert({
      where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
      update: { answer: dto.answer as any, isCorrect, score },
      create: { attemptId, questionId: dto.questionId, answer: dto.answer as any, isCorrect, score },
    });
  }

  /** Submits the attempt: multiple-choice is already scored; anything else is handed to the ai-grading queue. */
  async submit(ctx: AuthContext, attemptId: string) {
    const attempt = await this.ownAttempt(ctx, attemptId);
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('This attempt was already submitted');
    }

    const responses = await this.prisma.attemptResponse.findMany({
      where: { attemptId },
      include: { question: true },
    });

    const pending = responses.filter((r) => r.score === null);

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: pending.length ? AttemptStatus.GRADING : AttemptStatus.SUBMITTED, submittedAt: new Date() },
    });

    if (pending.length) {
      const student = await this.prisma.user.findUniqueOrThrow({ where: { id: attempt.studentId } });
      await this.aiGradingQueue.addBulk(
        pending.map((response) => ({
          name: 'grade-response',
          data: { attemptId, responseId: response.id, questionId: response.questionId, studentLocale: student.locale },
        })),
      );
    }

    if (!pending.length) {
      await this.finalize(attemptId);
    }

    return this.prisma.attempt.findUniqueOrThrow({ where: { id: attemptId }, include: { responses: true } });
  }

  /** Called once every response on an attempt has a score — sync path or after the last AI grade lands. */
  async finalize(attemptId: string): Promise<void> {
    const attempt = await this.prisma.attempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { responses: { include: { question: true } } },
    });

    const totalScore = attempt.responses.reduce((sum, r) => sum + (r.score ?? 0), 0);
    const hasAiGraded = attempt.responses.some((r) => r.aiFeedback);

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: AttemptStatus.GRADED,
        score: totalScore,
        gradedBy: hasAiGraded ? GradedBy.AI : GradedBy.AUTO,
        gradedAt: new Date(),
      },
    });

    await this.updateMastery(attempt.studentId, attempt.responses);
  }

  private async updateMastery(
    studentId: string,
    responses: { score: number | null; question: { skillId: string | null; points: number } }[],
  ): Promise<void> {
    for (const r of responses) {
      if (!r.question.skillId || r.score === null) continue;
      const correctness = computeCorrectness(r.score, r.question.points);

      const existing = await this.prisma.progressRecord.findUnique({
        where: { studentId_skillId: { studentId, skillId: r.question.skillId } },
      });
      const mastery = nextMastery(correctness, existing?.mastery);

      await this.prisma.progressRecord.upsert({
        where: { studentId_skillId: { studentId, skillId: r.question.skillId } },
        update: { mastery, attempts: { increment: 1 } },
        create: { studentId, skillId: r.question.skillId, mastery, attempts: 1 },
      });
    }
  }

  private async maxScore(assessmentId: string): Promise<number> {
    const questions = await this.prisma.question.findMany({ where: { assessmentId }, select: { points: true } });
    return questions.reduce((sum, q) => sum + q.points, 0);
  }

  private isChoiceCorrect(correctAnswer: unknown, submitted: unknown): boolean {
    return JSON.stringify(correctAnswer) === JSON.stringify(submitted);
  }

  private async ownAttempt(ctx: AuthContext, attemptId: string) {
    const attempt = await this.prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.studentId !== ctx.userId) throw new ForbiddenException('This attempt belongs to another student');
    return attempt;
  }
}
