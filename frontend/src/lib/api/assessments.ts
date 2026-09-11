import { api } from '@/lib/api-client';
import type { Assessment, Attempt } from '@/types/api';

export const assessmentsApi = {
  listForClass: (classId: string) => api.get<Assessment[]>(`/assessments?classId=${classId}`),
  getOne: (id: string) => api.get<Assessment>(`/assessments/${id}`),
  create: (dto: {
    classId: string;
    title: string;
    type: Assessment['type'];
    questions: { type: string; promptMarkdown: string; choices?: { id: string; label: string }[]; correctAnswer?: unknown; points: number }[];
  }) => api.post<Assessment>('/assessments', dto),
};

export const attemptsApi = {
  start: (assessmentId: string) => api.post<Attempt>(`/attempts/${assessmentId}/start`),
  submitAnswer: (attemptId: string, questionId: string, answer: unknown) =>
    api.post(`/attempts/${attemptId}/answers`, { questionId, answer }),
  submit: (attemptId: string) => api.post<Attempt>(`/attempts/${attemptId}/submit`),
};
