import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  create(@CurrentUser() ctx: AuthContext, @Body() dto: CreateAssessmentDto) {
    return this.assessments.create(ctx, dto);
  }

  @Get()
  listForClass(@CurrentUser() ctx: AuthContext, @Query('classId') classId: string) {
    return this.assessments.listForClass(ctx, classId);
  }

  @Get(':id')
  findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.assessments.findOne(ctx, id);
  }
}
