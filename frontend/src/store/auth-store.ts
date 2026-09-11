import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types/api';

// The access token is short-lived (15 min, architecture §07) and kept only
// in memory + sessionStorage — never localStorage, never the httpOnly
// refresh cookie the browser already manages on its own. Losing it on tab
// close is intentional; `bootstrapSession()` re-derives it from the refresh
// cookie on next load.
interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  setSession: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  clear: () => void;
}

type PersistedAuthState = Pick<AuthState, 'user'>;

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set) => ({
      user: null,
      accessToken: null,
      status: 'idle',
      setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),
    }),
    {
      name: 'jofran-auth',
      storage: {
        getItem: (name) => {
          const value = sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
      // Persist the profile for a fast repaint on reload; the access token
      // itself is re-fetched via refresh, not trusted from storage alone.
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
