import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

// Students log in with a school-issued username + temporary password, never
// a personal email — see architecture §15 (minimal student PII).
export class CreateStudentDto {
  @IsString()
  fullName!: string;

  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;

  @IsString()
  classId!: string;

  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;
}
