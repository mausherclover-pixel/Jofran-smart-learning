import { api } from '@/lib/api-client';
import type { ProgressReport } from '@/types/api';

export const reportsApi = {
  listForStudent: (studentId: string) => api.get<ProgressReport[]>(`/reports/students/${studentId}`),
  requestNow: (studentId: string) => api.post<{ queued: boolean }>(`/reports/students/${studentId}/generate`),
};
