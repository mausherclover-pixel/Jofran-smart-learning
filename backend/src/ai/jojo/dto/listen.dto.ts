import { IsEnum, IsString, MaxLength } from 'class-validator';
import { Locale } from '@prisma/client';

export class ListenDto {
  @IsString()
  @MaxLength(2000)
  text!: string;

  @IsEnum(Locale)
  locale!: Locale;
}
