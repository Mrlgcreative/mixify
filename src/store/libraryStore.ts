import { create } from 'zustand';

import { api } from '../api/musicApi';

interface LibraryStore {
  /** `track_id` -> identifiant du favori (absent = non liké). */
  favorites: Record<string, string>;
  /** Incrémentés après un changement pour recharger les écrans concernés. */
  favoriteRevision: number;
  playlistRevision: number;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (trackId: string) => Promise<void>;
  favoritesChanged: () => void;
  playlistsChanged: () => void;
}

/** État partagé des favoris et playlists (les réponses Forge sont lentes : on recharge à la demande). */
export const useLibraryStore = create<LibraryStore>((set, get) => ({
  favorites: {},
  favoriteRevision: 0,
  playlistRevision: 0,

  loadFavorites: async () => {
    try {
      const favorites = await api.getFavoriteIds();
      set({ favorites });
    } catch {
      set({ favorites: {} });
    }
  },

  toggleFavorite: async (trackId) => {
    const favoriteId = get().favorites[trackId];

    if (favoriteId) {
      // Retrait optimiste : l'icône réagit tout de suite, restaurée si l'API échoue.
      const { [trackId]: _removed, ...rest } = get().favorites;
      set({ favorites: rest });
      try {
        await api.removeFavorite(favoriteId);
        set((state) => ({ favoriteRevision: state.favoriteRevision + 1 }));
      } catch {
        set((state) => ({ favorites: { ...state.favorites, [trackId]: favoriteId } }));
      }
      return;
    }

    set((state) => ({ favorites: { ...state.favorites, [trackId]: `pending:${trackId}` } }));
    try {
      const id = await api.addFavorite(trackId);
      set((state) => ({
        favorites: { ...state.favorites, [trackId]: id },
        favoriteRevision: state.favoriteRevision + 1,
      }));
    } catch {
      set((state) => {
        const { [trackId]: _removed, ...rest } = state.favorites;
        return { favorites: rest };
      });
    }
  },

  favoritesChanged: () => set((state) => ({ favoriteRevision: state.favoriteRevision + 1 })),
  playlistsChanged: () => set((state) => ({ playlistRevision: state.playlistRevision + 1 })),
}));
