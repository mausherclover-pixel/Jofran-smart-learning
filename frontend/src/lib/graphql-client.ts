import { GRAPHQL_URL } from './config';
import { useAuthStore } from '@/store/auth-store';

/**
 * Minimal GraphQL fetcher for the composite dashboard queries (architecture
 * §03) — no Apollo Client; at one query so far, a full client is premature.
 */
export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = useAuthStore.getState().accessToken;

  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message ?? 'GraphQL request failed');
  }
  return json.data as T;
}
