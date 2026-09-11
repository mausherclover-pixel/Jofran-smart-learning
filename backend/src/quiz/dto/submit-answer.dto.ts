import { IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  questionId!: string;

  // Shape depends on the question's type: a choice id for MULTIPLE_CHOICE,
  // free text for SHORT_ANSWER / CONSTRUCTED_RESPONSE, an S3 key for SPEAKING.
  answer!: unknown;
}
