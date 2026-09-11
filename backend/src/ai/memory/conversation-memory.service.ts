import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAiService } from '../openai.service';
import { UsageTrackerService } from '../cost/usage-tracker.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Jojo's memory system (architecture §11). Two layers:
 *  1. A verbatim window of the last N turns — cheap, exact, sent as-is.
 *  2. Everything older than that, folded into one rolling `summary` string
 *     on AiConversation so a long-running conversation doesn't grow the
 *     prompt (and the bill) linearly with its length.
 *
 * Nothing is deleted from AiMessage — the full transcript stays queryable
 * for a teacher or guardian; only what gets *replayed to the model* shrinks.
 */
@Injectable()
export class ConversationMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly openAi: OpenAiService,
    private readonly usage: UsageTrackerService,
  ) {}

  /** Everything the next chat call needs: the rolling summary (if any) plus the recent verbatim turns. */
  async getContext(conversationId: string): Promise<{ summary: string | null; recentTurns: ChatTurn[] }> {
    const windowSize = this.config.get<number>('ai.jojoContextWindowTurns')!;

    const conversation = await this.prisma.aiConversation.findUniqueOrThrow({
      where: { id: conversationId },
      select: { summary: true },
    });

    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const recent = messages.slice(-windowSize);
    return {
      summary: conversation.summary,
      recentTurns: recent.map((m) => ({ role: m.role === 'student' ? 'user' : 'assistant', content: m.content })),
    };
  }

  /**
   * Called after appending a new turn. If the verbatim history has grown
   * past the window, summarizes everything outside the window into
   * `AiConversation.summary` using the cheap chat model — a background-ish
   * cost, not one that competes with the reply the student is waiting on.
   */
  async maybeSummarize(conversationId: string): Promise<void> {
    const windowSize = this.config.get<number>('ai.jojoContextWindowTurns')!;
    const messages = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length <= windowSize) return;

    const toFold = messages.slice(0, messages.length - windowSize);
    const conversation = await this.prisma.aiConversation.findUniqueOrThrow({ where: { id: conversationId } });

    const transcript = toFold.map((m) => `${m.role}: ${m.content}`).join('\n');
    const system =
      'Summarize this tutoring conversation in 2-3 sentences, preserving what the student is working on and any misconceptions Jojo corrected. Be factual, no commentary.';
    const user = conversation.summary
      ? `Previous summary: ${conversation.summary}\n\nNew turns to fold in:\n${transcript}`
      : `Turns to summarize:\n${transcript}`;

    const result = await this.openAi.chat({ model: this.openAi.modelChat, system, messages: [{ role: 'user', content: user }] });
    await this.usage.log({
      userId: conversation.studentId,
      feature: 'jojo-memory-summarize',
      model: this.openAi.modelChat,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });

    await this.prisma.aiConversation.update({ where: { id: conversationId }, data: { summary: result.content } });
  }
}
