import { api } from '@/lib/api-client';
import type { ProgressRecord } from '@/types/api';

export interface StudentProfile {
  id: string;
  fullName: string;
  username: string | null;
  schoolId: string;
  locale: string;
  enrollments: { class: { id: string; name: string; grade: number } }[];
}

export const studentsApi = {
  getProfile: (studentId: string) => api.get<StudentProfile>(`/students/${studentId}`),
  getProgress: (studentId: string) => api.get<ProgressRecord[]>(`/students/${studentId}/progress`),
};
