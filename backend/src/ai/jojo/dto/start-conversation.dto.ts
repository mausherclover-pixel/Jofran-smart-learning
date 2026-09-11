import { IsOptional, IsString } from 'class-validator';

export class StartConversationDto {
  @IsOptional()
  @IsString()
  lessonId?: string;
}
