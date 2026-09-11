import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Locale, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthContext } from '../../common/types/auth-context';
import { OpenAiService, AudioFile } from '../openai.service';
import { ConversationMemoryService } from '../memory/conversation-memory.service';
import { RetrievalService } from '../rag/retrieval.service';
import { RateLimiterService } from '../cost/rate-limiter.service';
import { UsageTrackerService } from '../cost/usage-tracker.service';
import { promptLibrary } from '../prompts/prompt-library';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

const REFUSAL: Record<Locale, string> = {
  TET: "Ita bele husu buat seluk kona-ba lisaun ne'e? Ha'u la bele hatan pergunta ne'e.",
  EN: "Let's keep talking about your lesson — could you ask that a different way?",
  ID: 'Yuk kita bahas pelajaran ini saja — coba tanyakan dengan cara lain, ya?',
};

const SCHOOL_WIDE_ROLES: Role[] = [Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.PRINCIPAL];

@Injectable()
export class JojoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAi: OpenAiService,
    private readonly memory: ConversationMemoryService,
    private readonly retrieval: RetrievalService,
    private readonly rateLimiter: RateLimiterService,
    private readonly usage: UsageTrackerService,
  ) {}

  async startConversation(ctx: AuthContext, dto: StartConversationDto) {
    const student = await this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    return this.prisma.aiConversation.create({
      data: { studentId: student.id, lessonId: dto.lessonId, locale: student.locale },
    });
  }

  /**
   * One turn of the loop: moderate → retrieve → recall memory → prompt →
   * generate → log cost → persist → maybe compress memory. Every step here
   * is one line of architecture §11.
   */
  async sendMessage(ctx: AuthContext, conversationId: string, dto: SendMessageDto): Promise<{ reply: string; flagged: boolean }> {
    const conversation = await this.prisma.aiConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.studentId !== ctx.userId) throw new ForbiddenException('This conversation belongs to another student');

    await this.rateLimiter.assertJojoQuota(ctx.userId);

    const moderation = await this.openAi.moderateText(dto.content);
    await this.persistMessage(conversationId, 'student', dto.content);

    if (moderation.flagged) {
      const refusal = REFUSAL[conversation.locale];
      await this.persistMessage(conversationId, 'jojo', refusal);
      return { reply: refusal, flagged: true };
    }

    const [student, enrollment] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
      this.prisma.enrollment.findFirst({ where: { studentId: ctx.userId }, include: { class: true }, orderBy: { createdAt: 'desc' } }),
    ]);
    const grade = enrollment?.class.grade ?? 1;

    const [memoryCtx, retrieved, currentLesson] = await Promise.all([
      this.memory.getContext(conversationId),
      this.retrieval.search(dto.content, student.locale, { grade }),
      conversation.lessonId ? this.loadLesson(conversation.lessonId, student.locale) : Promise.resolve(undefined),
    ]);

    const system = promptLibrary.jojoSystem({
      locale: student.locale,
      grade,
      studentName: student.fullName,
      currentLesson,
      retrieved,
      memorySummary: memoryCtx.summary,
    });

    const result = await this.openAi.chat({
      model: this.openAi.modelChat,
      system,
      messages: [...memoryCtx.recentTurns, { role: 'user', content: dto.content }],
    });

    await this.usage.log({
      userId: ctx.userId,
      feature: 'jojo-chat',
      model: this.openAi.modelChat,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    await this.persistMessage(conversationId, 'jojo', result.content, this.openAi.modelChat);
    await this.memory.maybeSummarize(conversationId);

    return { reply: result.content, flagged: false };
  }

  /** Full transcript — visible to the student themself, their guardian, their teacher, or school-wide roles (architecture §11's transparency rule). */
  async getHistory(ctx: AuthContext, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, student: { select: { schoolId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.assertCanView(ctx, conversation.studentId, conversation.student.schoolId!);
    return conversation;
  }

  /** Listening Assistant. */
  async listen(text: string, locale: Locale): Promise<{ audio: Buffer; mimeType: string }> {
    const result = await this.openAi.textToSpeech(text);
    await this.usage.log({ feature: 'jojo-tts', model: this.openAi.modelTts, promptTokens: text.length, completionTokens: 0 });
    return result;
  }

  /** Speaking Assistant — transcribes and, if a target phrase was given, scores pronunciation via a quick chat call. */
  async speak(ctx: AuthContext, file: AudioFile, targetPhrase?: string): Promise<{ transcript: string; feedback?: string }> {
    const { text: transcript } = await this.openAi.transcribeAudio(file);
    await this.usage.log({
      userId: ctx.userId,
      feature: 'jojo-transcribe',
      model: this.openAi.modelTranscribe,
      promptTokens: 0,
      completionTokens: 0,
    });

    if (!targetPhrase) return { transcript };

    const student = await this.prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    const result = await this.openAi.chat({
      model: this.openAi.modelChat,
      system: `You are Jojo, giving quick, encouraging pronunciation feedback to a child learning to speak. Respond in ${student.locale} in one short sentence.`,
      messages: [{ role: 'user', content: `Target phrase: "${targetPhrase}". What the student said: "${transcript}".` }],
    });
    await this.usage.log({
      userId: ctx.userId,
      feature: 'jojo-speaking-feedback',
      model: this.openAi.modelChat,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    return { transcript, feedback: result.content };
  }

  private async persistMessage(conversationId: string, role: 'student' | 'jojo', content: string, model?: string) {
    return this.prisma.aiMessage.create({ data: { conversationId, role, content, model } });
  }

  private async loadLesson(lessonId: string, locale: Locale) {
    const variant = await this.prisma.lessonLocale.findUnique({ where: { lessonId_locale: { lessonId, locale } } });
    return variant ? { title: variant.title, bodyMarkdown: variant.bodyMarkdown } : undefined;
  }

  private async assertCanView(ctx: AuthContext, studentId: string, schoolId: string): Promise<void> {
    if (SCHOOL_WIDE_ROLES.includes(ctx.role)) {
      if (ctx.role !== Role.SUPER_ADMIN && ctx.schoolId !== schoolId) {
        throw new ForbiddenException('This conversation is outside your access scope');
      }
      return;
    }
    if (ctx.role === Role.STUDENT && ctx.userId === studentId) return;
    if (ctx.role === Role.PARENT && ctx.studentIds.includes(studentId)) return;
    if (ctx.role === Role.TEACHER) {
      const enrolled = await this.prisma.enrollment.findFirst({
        where: { studentId, class: { teacherId: ctx.userId } },
      });
      if (enrolled) return;
    }
    throw new ForbiddenException('This conversation is outside your access scope');
  }
}
