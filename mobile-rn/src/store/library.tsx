import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { addFavorite, getFavoriteIds, removeFavorite } from '@/api/musicApi';
import { useAuth } from './auth';

interface LibraryContextValue {
  /** `trackId` -> identifiant du favori côté backend. */
  favorites: Record<string, string>;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  /** Invalide les caches de playlists après une mutation. */
  playlistsChanged: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

/** Favoris et signal de rafraîchissement des playlists du compte. */
export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [favorites, setFavorites] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise pendant le rendu quand la session se ferme (pas d'effet en cascade).
  const [owner, setOwner] = useState(user);
  if (user !== owner) {
    setOwner(user);
    if (!user) {
      setFavorites({});
      setLoaded(false);
    }
  }

  const load = useCallback(async () => {
    try {
      setFavorites(await getFavoriteIds());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Favoris indisponibles');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial lié au compte
    void load();
  }, [user, load]);

  const toggleFavorite = useCallback(async (trackId: string) => {
    const existing = favorites[trackId];
    if (existing) {
      setFavorites((current) => {
        const next = { ...current };
        delete next[trackId];
        return next;
      });
      try {
        await removeFavorite(existing);
        void queryClient.invalidateQueries({ queryKey: ['library'] });
      } catch (cause) {
        setFavorites((current) => ({ ...current, [trackId]: existing }));
        setError(cause instanceof Error ? cause.message : 'Retrait impossible');
      }
      return;
    }

    try {
      const id = await addFavorite(trackId);
      setFavorites((current) => ({ ...current, [trackId]: id }));
      void queryClient.invalidateQueries({ queryKey: ['library'] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Ajout impossible');
    }
  }, [favorites, queryClient]);

  const playlistsChanged = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['library'] });
    void queryClient.invalidateQueries({ queryKey: ['playlist'] });
    void queryClient.invalidateQueries({ queryKey: ['home'] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      favorites,
      loaded,
      error,
      load,
      toggleFavorite,
      playlistsChanged,
    }),
    [favorites, loaded, error, load, toggleFavorite, playlistsChanged],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibraryStore(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) throw new Error('useLibraryStore doit être utilisé dans LibraryProvider');
  return context;
}
