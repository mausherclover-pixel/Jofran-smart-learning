import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { QUEUE_REPORT_GENERATION } from '../common/queue/queue.constants';

// Nightly cron, Asia/Dili (architecture §09 / §13) — enqueues one job per
// active student rather than generating inline, so a large school doesn't
// block this process for minutes.
@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_REPORT_GENERATION) private readonly queue: Queue,
  ) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Dili' }) // 02:00 Dili time, every night
  async enqueueNightlyReports(): Promise<void> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const students = await this.prisma.user.findMany({
      where: { role: Role.STUDENT, isActive: true },
      select: { id: true },
    });

    await this.queue.addBulk(
      students.map((s) => ({
        name: 'generate-report',
        data: { studentId: s.id, periodStart, periodEnd },
      })),
    );

    this.logger.log(`Queued ${students.length} nightly progress reports`);
  }
}
