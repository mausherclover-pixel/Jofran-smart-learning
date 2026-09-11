import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumService } from './curriculum.service';

@Module({
  controllers: [ClassesController, CurriculumController],
  providers: [ClassesService, CurriculumService],
  exports: [ClassesService, CurriculumService],
})
export class AcademicModule {}
