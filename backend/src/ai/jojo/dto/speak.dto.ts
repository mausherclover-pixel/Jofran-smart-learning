import { IsOptional, IsString } from 'class-validator';

// The audio itself arrives as a multipart file (see JojoController.speak);
// this DTO only covers the form fields alongside it.
export class SpeakDto {
  @IsOptional()
  @IsString()
  targetPhrase?: string; // what the student was asked to say — enables a pronunciation score
}
