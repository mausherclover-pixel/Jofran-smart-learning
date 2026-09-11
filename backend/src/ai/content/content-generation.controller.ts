import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthContext } from '../../common/types/auth-context';
import { GenerateStoryDto } from './dto/generate-story.dto';
import { GenerateQuizDraftDto } from './dto/generate-quiz-draft.dto';
import { StoryGeneratorService } from './story-generator.service';
import { QuizGeneratorService } from './quiz-generator.service';

// Curriculum-editor tooling — never reachable by a student, and everything
// these endpoints return is a draft a human reviews before it's published
// or turned into a real Assessment (architecture §11).
@Controller('ai/content')
@UseGuards(RolesGuard)
@Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
export class ContentGenerationController {
  constructor(
    private readonly stories: StoryGeneratorService,
    private readonly quizzes: QuizGeneratorService,
  ) {}

  @Post('story')
  generateStory(@CurrentUser() ctx: AuthContext, @Body() dto: GenerateStoryDto) {
    return this.stories.generate(dto, ctx.userId);
  }

  @Post('quiz-draft')
  generateQuizDraft(@CurrentUser() ctx: AuthContext, @Body() dto: GenerateQuizDraftDto) {
    return this.quizzes.draftFromLesson(dto.lessonId, dto.questionCount, ctx.userId);
  }
}
