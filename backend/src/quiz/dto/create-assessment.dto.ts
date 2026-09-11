import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AssessmentType, Prisma, QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  promptMarkdown!: string;

  @IsOptional()
  choices?: { id: string; label: string }[];

  @IsOptional()
  correctAnswer?: Prisma.InputJsonValue;

  @IsOptional()
  @IsString()
  rubric?: string;

  @IsOptional()
  @IsString()
  skillId?: string;

  @IsInt()
  @Min(1)
  points: number = 1;
}

export class CreateAssessmentDto {
  @IsString()
  classId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  @IsEnum(AssessmentType)
  type: AssessmentType = AssessmentType.QUIZ;

  @IsString()
  title!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
