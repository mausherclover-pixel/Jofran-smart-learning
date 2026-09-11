import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SCHOOL_ADMIN, Role.PRINCIPAL, Role.TEACHER)
  create(@CurrentUser() ctx: AuthContext, @Body() dto: CreateStudentDto) {
    return this.students.create(ctx, ctx.schoolId!, dto);
  }

  @Get('by-class/:classId')
  listForClass(@CurrentUser() ctx: AuthContext, @Param('classId') classId: string) {
    return this.students.listForClass(ctx, classId);
  }

  @Get(':id')
  findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.students.findOne(ctx, id);
  }

  @Get(':id/progress')
  progress(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.students.progress(ctx, id);
  }
}
