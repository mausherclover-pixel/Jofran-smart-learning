import { api } from '@/lib/api-client';
import type { ClassSummary } from '@/types/api';

export interface PendingGradingItem {
  id: string;
  student: { id: string; fullName: string };
  assessment: { id: string; title: string; classId: string };
}

export const teachersApi = {
  myClasses: () => api.get<ClassSummary[]>('/teachers/me/classes'),
  pendingGrading: () => api.get<PendingGradingItem[]>('/teachers/me/pending-grading'),
};

export const classesApi = {
  listForSchool: (schoolId: string) => api.get<ClassSummary[]>(`/classes?schoolId=${schoolId}`),
  getOne: (id: string) => api.get<ClassSummary & { enrollments: { student: { id: string; fullName: string } }[] }>(`/classes/${id}`),
};
