import { Module } from '@nestjs/common';
import { QueueModule } from '../common/queue/queue.module';
import { AiModule } from '../ai/ai.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { AiGradingProcessor } from './processors/ai-grading.processor';

@Module({
  imports: [QueueModule, AiModule],
  controllers: [AssessmentsController, AttemptsController],
  providers: [AssessmentsService, AttemptsService, AiGradingProcessor],
  exports: [AssessmentsService, AttemptsService],
})
export class QuizModule {}
