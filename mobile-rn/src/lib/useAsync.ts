import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { recordCacheRead } from './metrics';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Lecture API mise en cache (TanStack Query) : le premier rendu vient du
 * cache mémoire/disque, puis une revalidation réseau se fait en arrière-plan.
 */
export function useAsync<T>(key: string, fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const queryKey = [key, ...deps];
  const counted = useRef(false);

  const query = useQuery({ queryKey, queryFn: fn });

  // Un premier rendu sans fetch réseau = donné servi par le cache.
  useEffect(() => {
    if (counted.current || query.data === undefined) return;
    counted.current = true;
    recordCacheRead(!query.isFetchedAfterMount);
  }, [query.data, query.isFetchedAfterMount]);

  const { refetch } = query;

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    data: query.data ?? null,
    loading: query.isPending,
    // Une erreur de revalidation ne masque pas les données déjà affichées.
    error: query.data === undefined && query.error ? query.error.message : null,
    retry,
  };
}
