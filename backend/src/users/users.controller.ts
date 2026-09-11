import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() ctx: AuthContext) {
    return this.users.me(ctx);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL)
  list(@CurrentUser() ctx: AuthContext, @Query('schoolId') schoolId: string) {
    return this.users.listForSchool(ctx, schoolId ?? ctx.schoolId);
  }

  @Get(':id')
  findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.users.findOne(ctx, id);
  }

  @Patch(':id')
  update(@CurrentUser() ctx: AuthContext, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(ctx, id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  deactivate(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.users.deactivate(ctx, id);
  }
}
