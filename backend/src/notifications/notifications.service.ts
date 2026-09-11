import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthContext } from '../common/types/auth-context';
import { QUEUE_NOTIFICATION_FANOUT } from '../common/queue/queue.constants';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NOTIFICATION_FANOUT) private readonly queue: Queue,
  ) {}

  /** Called by other modules (grading, messaging, announcements) — never by a controller directly. */
  async notify(userId: string, channel: NotificationChannel, templateKey: string, payload: Record<string, any>) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { locale: true } });

    const notification = await this.prisma.notification.create({
      data: { userId, channel, templateKey, payload, locale: user.locale },
    });

    await this.queue.add('fan-out', { notificationId: notification.id });
    return notification;
  }

  async listMine(ctx: AuthContext, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId: ctx.userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(ctx: AuthContext, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId: ctx.userId },
      data: { readAt: new Date() },
    });
  }
}
