import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Locale } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurriculumService } from './curriculum.service';
import { UpsertLessonLocaleDto } from './dto/upsert-lesson-locale.dto';

@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculum: CurriculumService) {}

  @Get('subjects')
  listSubjects(@Query('grade') grade: string) {
    return this.curriculum.listSubjects(parseInt(grade, 10));
  }

  @Get('lessons/:id')
  getLesson(@Param('id') id: string, @Query('locale') locale?: Locale) {
    return this.curriculum.getLesson(id, locale ?? Locale.TET);
  }

  @Post('lessons/:id/locales')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  upsertLocale(@Param('id') id: string, @Body() dto: UpsertLessonLocaleDto) {
    return this.curriculum.upsertLessonLocale(id, dto);
  }

  @Patch('lessons/:id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  publish(@Param('id') id: string) {
    return this.curriculum.publishLesson(id);
  }
}
