import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  QUEUE_AI_GRADING,
  QUEUE_CACHE_INVALIDATION,
  QUEUE_MEDIA_TRANSCODE,
  QUEUE_NOTIFICATION_FANOUT,
  QUEUE_REPORT_GENERATION,
} from './queue.constants';

// Registers BullMQ's connection once, then every named queue. Import
// QueueModule wherever a module needs to enqueue a job; the worker
// (Processor) that consumes it lives in that job's owning module.
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redis.url') },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_AI_GRADING },
      { name: QUEUE_NOTIFICATION_FANOUT },
      { name: QUEUE_REPORT_GENERATION },
      { name: QUEUE_MEDIA_TRANSCODE },
      { name: QUEUE_CACHE_INVALIDATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
