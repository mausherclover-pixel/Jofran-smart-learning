import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QUEUE_NOTIFICATION_FANOUT } from '../../common/queue/queue.constants';
import { NotificationsGateway } from '../notifications.gateway';
import { renderTemplate } from '../templates';

interface FanoutJob {
  notificationId: string;
}

// Consumes notification-fanout (architecture §09): renders the per-locale
// template, then delivers via whichever channel the Notification was
// created with.
@Processor(QUEUE_NOTIFICATION_FANOUT)
export class NotificationFanoutProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationFanoutProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<FanoutJob>): Promise<void> {
    const notification = await this.prisma.notification.findUniqueOrThrow({
      where: { id: job.data.notificationId },
    });

    try {
      const rendered = renderTemplate(notification.templateKey, notification.locale, notification.payload as any);

      switch (notification.channel) {
        case NotificationChannel.PUSH:
          this.gateway.pushToUser(notification.userId, { ...rendered, templateKey: notification.templateKey });
          break;
        case NotificationChannel.EMAIL:
          // TODO(Step 5 — infra): wire an email provider (e.g. SES). Logged
          // for now so the fan-out path is exercisable end-to-end without one.
          this.logger.log(`[email stub] to user ${notification.userId}: ${rendered.title}`);
          break;
        case NotificationChannel.SMS:
          // TODO(Phase 3 — architecture §17): SMS fallback for parents
          // without a smartphone. Wire a regional SMS gateway here.
          this.logger.log(`[sms stub] to user ${notification.userId}: ${rendered.title}`);
          break;
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Failed to fan out notification ${notification.id}`, err);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      });
      throw err; // let BullMQ retry per the queue's backoff policy
    }
  }
}
