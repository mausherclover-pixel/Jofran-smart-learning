import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { AttemptsService } from './attempts.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Controller('attempts')
@UseGuards(RolesGuard)
@Roles(Role.STUDENT)
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post(':assessmentId/start')
  start(@CurrentUser() ctx: AuthContext, @Param('assessmentId') assessmentId: string) {
    return this.attempts.start(ctx, assessmentId);
  }

  @Post(':attemptId/answers')
  submitAnswer(@CurrentUser() ctx: AuthContext, @Param('attemptId') attemptId: string, @Body() dto: SubmitAnswerDto) {
    return this.attempts.submitAnswer(ctx, attemptId, dto);
  }

  @Post(':attemptId/submit')
  submit(@CurrentUser() ctx: AuthContext, @Param('attemptId') attemptId: string) {
    return this.attempts.submit(ctx, attemptId);
  }
}
