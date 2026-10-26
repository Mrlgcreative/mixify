import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from '../api/musicApi';
import type { ChartPeriod } from '../api/musicApi';
import { useLibraryStore } from '../store/libraryStore';
import type {
  ArtistDashboard,
  ArtistStats,
  HistoryEntry,
  HomeFeed,
  Library,
  Playlist,
  SearchResults,
  Track,
} from '../types/music';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Le backend a répondu 404 : le contenu n'existe pas. */
  notFound: boolean;
  /** Relance la requête (bouton « Réessayer »). */
  retry: () => void;
}

type AsyncData<T> = Omit<AsyncState<T>, 'retry'>;

/**
 * Hook générique d'accès à l'API : gère le chargement, l'erreur et
 * l'annulation des réponses obsolètes (frappe rapide dans la recherche).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncData<T>>({
    data: null,
    loading: true,
    error: null,
    notFound: false,
  });
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  const retry = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, error: null, notFound: false }));
    fn()
      .then((data) => {
        if (id === requestId.current) {
          setState({ data, loading: false, error: null, notFound: false });
        }
      })
      .catch((error: unknown) => {
        if (id === requestId.current) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            notFound: error instanceof ApiError && error.status === 404,
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les dépendances sont fournies par l'appelant
  }, [...deps, revision]);

  return { ...state, retry };
}

/** Contenu de la page d'accueil. */
export function useHomeFeed(): AsyncState<HomeFeed> {
  const playlistRevision = useLibraryStore((state) => state.playlistRevision);
  return useAsync(() => api.getHome(), [playlistRevision]);
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

/** Suggestions rapides pour l'autocomplétion (déclenchées par `query` avec debounce). */
export function useSearchSuggestions(query: string, delay = 200): AsyncState<SearchResults> {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  const enabled = debounced.trim().length >= 2;
  const state = useAsync(
    async () =>
      enabled ? api.search(debounced) : { tracks: [], albums: [], artists: [], playlists: [] },
    [debounced, enabled],
  );
  return state;
}

/** Détail d'une playlist. */
export function usePlaylist(id: string | null): AsyncState<Playlist> {
  const playlistRevision = useLibraryStore((state) => state.playlistRevision);
  return useAsync(async () => {
    if (!id) throw new Error('Aucune playlist sélectionnée');
    return api.getPlaylist(id);
  }, [id, playlistRevision]);
}

/** Bibliothèque de l'utilisateur. */
export function useLibrary(): AsyncState<Library> {
  const favoriteRevision = useLibraryStore((state) => state.favoriteRevision);
  const playlistRevision = useLibraryStore((state) => state.playlistRevision);
  return useAsync(() => api.getLibrary(), [favoriteRevision, playlistRevision]);
}

/** Catalogue complet (sélecteur d'ajout dans une playlist). */
export function useTracks(): AsyncState<Track[]> {
  return useAsync(() => api.getTracks(), []);
}

/** Classement des titres les plus écoutés (semaine, mois, année). */
export function useChart(period: ChartPeriod): AsyncState<Track[]> {
  return useAsync(() => api.getChart(period), [period]);
}

/** Historique d'écoute du compte (relancé via `revision`). */
export function useHistory(revision = 0): AsyncState<HistoryEntry[]> {
  return useAsync(() => api.getHistory(), [revision]);
}

/** Espace artiste : profil + morceaux du compte (relancé via `revision`). */
export function useMyArtist(revision = 0): AsyncState<ArtistDashboard | null> {
  return useAsync(() => api.getMyArtist(), [revision]);
}

/** Espace artiste : statistiques d'écoute du catalogue (relancées via `revision`). */
export function useArtistStats(revision = 0): AsyncState<ArtistStats | null> {
  return useAsync(() => api.getArtistStats(), [revision]);
}
