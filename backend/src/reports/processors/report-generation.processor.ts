import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_REPORT_GENERATION } from '../../common/queue/queue.constants';
import { ReportNarrativeService } from '../../ai/report-narrative.service';

interface GenerateReportJob {
  studentId: string;
  periodStart: string | Date;
  periodEnd: string | Date;
}

// Consumes report-generation (architecture §09): compiles the JSON summary
// deterministically (what the parent dashboard reads) and asks the Parent
// Report Generator (architecture §11) for a one-paragraph narrative around
// it. `s3Key` stays null — turning this into a PDF is a Media/Storage
// concern (MediaModule's signed-URL flow) that hasn't been built yet.
@Processor(QUEUE_REPORT_GENERATION)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly narrative: ReportNarrativeService,
  ) {
    super();
  }

  async process(job: Job<GenerateReportJob>): Promise<void> {
    const { studentId } = job.data;
    const periodStart = new Date(job.data.periodStart);
    const periodEnd = new Date(job.data.periodEnd);

    const [student, progress, attempts] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: studentId } }),
      this.prisma.progressRecord.findMany({ where: { studentId }, include: { skill: true } }),
      this.prisma.attempt.findMany({
        where: { studentId, gradedAt: { gte: periodStart, lte: periodEnd } },
        select: { score: true, maxScore: true },
      }),
    ]);

    const scored = attempts.filter((a) => a.maxScore && a.maxScore > 0);
    const averageScore = scored.length
      ? scored.reduce((sum, a) => sum + (a.score ?? 0) / a.maxScore!, 0) / scored.length
      : null;

    const bySkill = progress.map((p) => ({ skillId: p.skillId, name: p.skill.name, mastery: p.mastery }));
    const summary = { bySkill, attemptsCompleted: attempts.length, averageScore };

    // Skip the AI call entirely for a student with nothing to report yet —
    // no attempts this period means there's nothing true to say, and it
    // saves a call on every newly-enrolled student's first empty week.
    const narrative = attempts.length > 0
      ? await this.narrative.generate({
          studentId,
          studentName: student.fullName,
          locale: student.locale,
          bySkill,
          attemptsCompleted: attempts.length,
        })
      : null;

    await this.prisma.progressReport.upsert({
      where: { studentId_periodStart_periodEnd: { studentId, periodStart, periodEnd } },
      update: { summary, narrative },
      create: { studentId, periodStart, periodEnd, summary, narrative },
    });

    this.logger.log(`Generated progress report for student ${studentId} (${attempts.length} attempts in period)`);
  }
}
