import { api } from '@/lib/api-client';
import type { AuthUser, ClassSummary } from '@/types/api';

export const schoolsApi = {
  listStaff: (schoolId: string) => api.get<AuthUser[]>(`/users?schoolId=${schoolId}`),
  listClasses: (schoolId: string) => api.get<ClassSummary[]>(`/classes?schoolId=${schoolId}`),
};
