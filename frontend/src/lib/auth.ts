import { API_BASE_URL } from './config';
import { api } from './api-client';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser } from '@/types/api';

interface LoginResponse {
  accessToken: string;
}

/** POST /auth/login — identifier is a school-issued username (students) or email (everyone else). */
export async function login(identifier: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Invalid credentials' }));
    throw new Error(body.message ?? 'Invalid credentials');
  }

  const { accessToken } = (await res.json()) as LoginResponse;
  useAuthStore.getState().setAccessToken(accessToken);

  const user = await api.get<AuthUser>('/users/me');
  useAuthStore.getState().setSession(user, accessToken);
  return user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  useAuthStore.getState().clear();
}

/**
 * Runs once on app load: the refresh cookie (httpOnly, invisible to JS) is
 * the only durable proof of a session — this exchanges it for a fresh
 * access token so a reload doesn't force a re-login every 15 minutes.
 */
export async function bootstrapSession(): Promise<void> {
  useAuthStore.setState({ status: 'loading' });
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('No session');

    const { accessToken } = (await res.json()) as LoginResponse;
    useAuthStore.getState().setAccessToken(accessToken);

    const user = await api.get<AuthUser>('/users/me');
    useAuthStore.getState().setSession(user, accessToken);
  } catch {
    useAuthStore.getState().clear();
  }
}

/** Where each role lands after login — used by the login page and the root redirect. */
export function homePathForRole(role: AuthUser['role']): string {
  switch (role) {
    case 'STUDENT':
      return '/student';
    case 'PARENT':
      return '/parent';
    case 'TEACHER':
      return '/teacher';
    case 'PRINCIPAL':
    case 'SCHOOL_ADMIN':
      return '/principal';
    case 'SUPER_ADMIN':
      return '/admin';
  }
}
