'use client';

import { useEffect, useState } from 'react';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Small fetch-on-mount hook shared by every dashboard page. Deliberately not
 * a full data-fetching library (react-query, SWR) — one query per page,
 * refetched on `deps` change, is all these screens need today.
 */
export function useApiData<T>(fetcher: () => Promise<T>, deps: React.DependencyList = []): State<T> & { refetch: () => void } {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { ...state, refetch: () => setTick((t) => t + 1) };
}
