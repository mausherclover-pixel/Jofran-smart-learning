import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { Locale } from '@prisma/client';

export class GenerateStoryDto {
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @IsString()
  subjectSlug!: string;

  @IsEnum(Locale)
  locale!: Locale;

  @IsString()
  theme!: string;
}
