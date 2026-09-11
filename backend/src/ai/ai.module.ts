import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';
import { ConversationMemoryService } from './memory/conversation-memory.service';
import { RetrievalService } from './rag/retrieval.service';
import { UsageTrackerService } from './cost/usage-tracker.service';
import { RateLimiterService } from './cost/rate-limiter.service';
import { ReportNarrativeService } from './report-narrative.service';
import { JojoController } from './jojo/jojo.controller';
import { JojoService } from './jojo/jojo.service';
import { StoryGeneratorService } from './content/story-generator.service';
import { QuizGeneratorService } from './content/quiz-generator.service';
import { ContentGenerationController } from './content/content-generation.controller';

// Everything from architecture §11 lives here: the OpenAI client, the
// model-routing that keeps it cheap, Jojo's memory and RAG, and the
// content-generation tools a teacher/editor uses. QuizModule's ai-grading
// processor and ReportsModule's narrative step both import this module for
// OpenAiService / ReportNarrativeService rather than instantiating their own.
@Module({
  controllers: [JojoController, ContentGenerationController],
  providers: [
    OpenAiService,
    ConversationMemoryService,
    RetrievalService,
    UsageTrackerService,
    RateLimiterService,
    ReportNarrativeService,
    JojoService,
    StoryGeneratorService,
    QuizGeneratorService,
  ],
  exports: [OpenAiService, UsageTrackerService, ReportNarrativeService],
})
export class AiModule {}
