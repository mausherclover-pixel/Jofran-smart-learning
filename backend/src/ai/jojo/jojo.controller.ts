import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthContext } from '../../common/types/auth-context';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListenDto } from './dto/listen.dto';
import { SpeakDto } from './dto/speak.dto';
import { JojoService } from './jojo.service';

@Controller('ai/jojo')
export class JojoController {
  constructor(private readonly jojo: JojoService) {}

  @Post('conversations')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  start(@CurrentUser() ctx: AuthContext, @Body() dto: StartConversationDto) {
    return this.jojo.startConversation(ctx, dto);
  }

  @Post('conversations/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  sendMessage(@CurrentUser() ctx: AuthContext, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.jojo.sendMessage(ctx, id, dto);
  }

  // No @Roles — visibility is resolved inside JojoService.getHistory (student,
  // guardian, teacher, or school-wide roles), the same transparency rule
  // that applies to every AI/student interaction (architecture §11).
  @Get('conversations/:id')
  getHistory(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.jojo.getHistory(ctx, id);
  }

  @Post('listen')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  async listen(@Body() dto: ListenDto, @Res() res: Response) {
    const { audio, mimeType } = await this.jojo.listen(dto.text, dto.locale);
    res.setHeader('Content-Type', mimeType);
    res.send(audio);
  }

  @Post('speak')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @UseInterceptors(FileInterceptor('audio', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  speak(@CurrentUser() ctx: AuthContext, @UploadedFile() audio: Express.Multer.File, @Body() dto: SpeakDto) {
    return this.jojo.speak(
      ctx,
      { buffer: audio.buffer, filename: audio.originalname, mimetype: audio.mimetype },
      dto.targetPhrase,
    );
  }
}
