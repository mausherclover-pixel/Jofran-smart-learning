import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL)
  create(@CurrentUser() ctx: AuthContext, @Body() dto: CreateClassDto) {
    return this.classes.create(ctx, ctx.schoolId!, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL)
  listForSchool(@CurrentUser() ctx: AuthContext, @Query('schoolId') schoolId: string) {
    return this.classes.listForSchool(ctx, schoolId ?? ctx.schoolId);
  }

  @Get(':id')
  findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.classes.findOne(ctx, id);
  }
}
