import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  // Students log in with a school-issued username; staff/parents typically
  // use email — both resolve through the same `identifier` field.
  @IsString()
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
