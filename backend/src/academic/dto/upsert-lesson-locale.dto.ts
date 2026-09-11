import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Locale } from '@prisma/client';

// One row per locale (architecture §13) — never a fallback string.
export class UpsertLessonLocaleDto {
  @IsEnum(Locale)
  locale!: Locale;

  @IsString()
  title!: string;

  @IsString()
  bodyMarkdown!: string;

  @IsOptional()
  @IsArray()
  mediaKeys?: string[];

  @IsOptional()
  @IsBoolean()
  aiDrafted?: boolean;
}
