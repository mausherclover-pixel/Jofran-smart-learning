import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@UseGuards(RolesGuard)
@Roles(Role.TEACHER)
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get('me/classes')
  myClasses(@CurrentUser() ctx: AuthContext) {
    return this.teachers.myClasses(ctx);
  }

  @Get('me/pending-grading')
  pendingGrading(@CurrentUser() ctx: AuthContext) {
    return this.teachers.pendingGrading(ctx);
  }
}
