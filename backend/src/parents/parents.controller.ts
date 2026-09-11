import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { ParentsService } from './parents.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Post('link')
  @UseGuards(RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER)
  link(@CurrentUser() ctx: AuthContext, @Body() dto: LinkGuardianDto) {
    return this.parents.link(ctx, dto);
  }

  @Get('me/children')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  myChildren(@CurrentUser() ctx: AuthContext) {
    return this.parents.myChildren(ctx);
  }

  @Get('children/:studentId/progress')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  childProgress(@CurrentUser() ctx: AuthContext, @Param('studentId') studentId: string) {
    return this.parents.childProgress(ctx, studentId);
  }
}
