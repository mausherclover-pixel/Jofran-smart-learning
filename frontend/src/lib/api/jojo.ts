import { api } from '@/lib/api-client';

export interface AiConversation {
  id: string;
  lessonId: string | null;
  locale: string;
}

export interface JojoReply {
  reply: string;
  flagged: boolean;
}

export const jojoApi = {
  startConversation: (lessonId?: string) => api.post<AiConversation>('/ai/jojo/conversations', { lessonId }),
  sendMessage: (conversationId: string, content: string) =>
    api.post<JojoReply>(`/ai/jojo/conversations/${conversationId}/messages`, { content }),
};
