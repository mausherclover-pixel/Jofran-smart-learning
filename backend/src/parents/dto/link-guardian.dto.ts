import { IsOptional, IsString } from 'class-validator';

// Links an existing Parent account to a Student. Issued by a Teacher or
// School Administrator — a parent never links themself to an arbitrary
// student id.
export class LinkGuardianDto {
  @IsString()
  parentId!: string;

  @IsString()
  studentId!: string;

  @IsOptional()
  @IsString()
  relation?: string; // "parent" | "guardian" | "caregiver"
}
