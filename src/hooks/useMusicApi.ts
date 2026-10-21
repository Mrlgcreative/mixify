import { useEffect, useRef, useState } from 'react';

import { api } from '../api/musicApi';
import type { HomeFeed, Library, Playlist, SearchResults } from '../types/music';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook générique d'accès à l'API : gère le chargement, l'erreur et
 * l'annulation des réponses obsolètes (frappe rapide dans la recherche).
 */
function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    fn()
      .then((data) => {
        if (id === requestId.current) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (id === requestId.current) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les dépendances sont fournies par l'appelant
  }, deps);

  return state;
}

/** Contenu de la page d'accueil. */
export function useHomeFeed(): AsyncState<HomeFeed> {
  return useAsync(() => api.getHome(), []);
}

/** Recherche (déclenchée par `query`). */
export function useSearch(query: string): AsyncState<SearchResults> {
  const enabled = query.trim().length > 0;
  const state = useAsync(
    async () => (enabled ? api.search(query) : { tracks: [], albums: [], artists: [], playlists: [] }),
    [query, enabled],
  );
  return state;
}

/** Détail d'une playlist. */
export function usePlaylist(id: string | null): AsyncState<Playlist> {
  return useAsync(async () => {
    if (!id) throw new Error('Aucune playlist sélectionnée');
    return api.getPlaylist(id);
  }, [id]);
}

/** Bibliothèque de l'utilisateur. */
export function useLibrary(): AsyncState<Library> {
  return useAsync(() => api.getLibrary(), []);
}
