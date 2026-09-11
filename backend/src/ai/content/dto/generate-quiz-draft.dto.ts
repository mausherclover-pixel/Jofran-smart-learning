import { IsInt, IsString, Max, Min } from 'class-validator';

export class GenerateQuizDraftDto {
  @IsString()
  lessonId!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  questionCount: number = 5;
}
