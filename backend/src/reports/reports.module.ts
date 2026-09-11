import { Module } from '@nestjs/common';
import { QueueModule } from '../common/queue/queue.module';
import { AiModule } from '../ai/ai.module';
import { ReportGenerationProcessor } from './processors/report-generation.processor';
import { ReportSchedulerService } from './report-scheduler.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [QueueModule, AiModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportGenerationProcessor, ReportSchedulerService],
  exports: [ReportsService],
})
export class ReportsModule {}
