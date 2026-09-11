import { Inject, Injectable } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { Redis } from 'ioredis';
import { PrismaService } from '../common/prisma/prisma.service';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import { UpsertLessonLocaleDto } from './dto/upsert-lesson-locale.dto';

const CACHE_TTL_SECONDS = 60 * 60; // 1h, warmed on publish — architecture §10

@Injectable()
export class CurriculumService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async listSubjects(grade: number) {
    return this.prisma.subject.findMany({ where: { grade }, include: { units: { orderBy: { order: 'asc' } } } });
  }

  /** Cache-first read — the highest-traffic, least-volatile query in the system. */
  async getLesson(lessonId: string, locale: Locale) {
    const cacheKey = `curriculum:lesson:${lessonId}:${locale}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { variants: { where: { locale } }, unit: { include: { subject: true } } },
    });

    if (lesson) await this.redis.set(cacheKey, JSON.stringify(lesson), 'EX', CACHE_TTL_SECONDS);
    return lesson;
  }

  /**
   * Publishes (or edits) a lesson's content for one locale. Runs the
   * cache-invalidation step inline here for simplicity; at scale this moves
   * to the `cache-invalidation` BullMQ queue (architecture §09) so a large
   * curriculum push doesn't block the request.
   */
  async upsertLessonLocale(lessonId: string, dto: UpsertLessonLocaleDto) {
    const variant = await this.prisma.lessonLocale.upsert({
      where: { lessonId_locale: { lessonId, locale: dto.locale } },
      update: {
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        mediaKeys: dto.mediaKeys ?? [],
        aiDrafted: dto.aiDrafted ?? false,
      },
      create: {
        lessonId,
        locale: dto.locale,
        title: dto.title,
        bodyMarkdown: dto.bodyMarkdown,
        mediaKeys: dto.mediaKeys ?? [],
        aiDrafted: dto.aiDrafted ?? false,
      },
    });

    await this.redis.del(`curriculum:lesson:${lessonId}:${dto.locale}`);
    return variant;
  }

  async publishLesson(lessonId: string) {
    return this.prisma.lesson.update({ where: { id: lessonId }, data: { published: true } });
  }
}
