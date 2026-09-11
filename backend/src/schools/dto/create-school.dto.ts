import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SchoolPlan } from '@prisma/client';

export class CreateSchoolDto {
  @IsString()
  name!: string;

  @IsString()
  municipality!: string;

  @IsOptional()
  @IsEnum(SchoolPlan)
  plan?: SchoolPlan;
}
