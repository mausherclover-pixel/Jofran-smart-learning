import { api } from '@/lib/api-client';

export interface School {
  id: string;
  name: string;
  municipality: string;
  plan: 'PILOT' | 'STANDARD' | 'DISTRICT';
  createdAt: string;
}

export const adminApi = {
  listSchools: () => api.get<School[]>('/schools'),
};
