import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Locale } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(Locale)
  locale?: Locale;
}
