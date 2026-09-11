import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

/**
 * Daily Jojo message quota per student (architecture §11: "rate-limited per
 * student per day"). A Redis counter keyed by day, not `nestjs-throttler`'s
 * sliding window — this is a per-feature business quota, not a generic
 * per-route rate limit.
 */
@Injectable()
export class RateLimiterService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async assertJojoQuota(studentId: string): Promise<void> {
    const limit = this.config.get<number>('ai.jojoDailyMessageLimit')!;
    const key = `ratelimit:jojo:${studentId}:${this.todayKey()}`;

    const count = await this.redis.incr(key);
    if (count === 1) await this.redis.expire(key, 60 * 60 * 24);

    if (count > limit) {
      throw new HttpException(
        `Daily conversation limit reached (${limit} messages) — try again tomorrow.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC — fine at daily granularity
  }
}
