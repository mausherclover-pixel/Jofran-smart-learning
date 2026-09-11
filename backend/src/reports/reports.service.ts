import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { assertStudentScope } from '../common/scope/scope.util';
import { QUEUE_REPORT_GENERATION } from '../common/queue/queue.constants';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_REPORT_GENERATION) private readonly queue: Queue,
  ) {}

  async listForStudent(ctx: AuthContext, studentId: string) {
    assertStudentScope(ctx, studentId);
    return this.prisma.progressReport.findMany({ where: { studentId }, orderBy: { periodEnd: 'desc' } });
  }

  /** Queues an on-demand report instead of generating it inline — the same job the nightly cron enqueues (architecture §09). */
  async requestNow(ctx: AuthContext, studentId: string) {
    assertStudentScope(ctx, studentId);
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    await this.queue.add('generate-report', { studentId, periodStart, periodEnd });
    return { queued: true };
  }
}
