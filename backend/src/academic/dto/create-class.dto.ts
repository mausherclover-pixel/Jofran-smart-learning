import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateClassDto {
  @IsString()
  academicTermId!: string;

  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}
