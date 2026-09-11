import { api } from '@/lib/api-client';
import type { Lesson, Locale } from '@/types/api';

export const curriculumApi = {
  getLesson: (lessonId: string, locale: Locale) => api.get<Lesson>(`/curriculum/lessons/${lessonId}?locale=${locale}`),
};
