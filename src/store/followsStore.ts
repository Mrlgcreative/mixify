import { create } from 'zustand';

import { api } from '../api/musicApi';
import type { Artist, ArtistProfile, Follower, FollowedArtist } from '../types/music';

interface FollowsStore {
  following: FollowedArtist[];
  followers: Follower[];
  myArtist: ArtistProfile | null;
  loaded: boolean;
  busyId: string | null;
  error: string | null;
  load: () => Promise<void>;
  toggle: (artist: Artist) => Promise<void>;
  reset: () => void;
}

/** Abonnements partagés entre la recherche, le profil et l'espace artiste. */
export const useFollows = create<FollowsStore>((set, get) => ({
  following: [],
  followers: [],
  myArtist: null,
  loaded: false,
  busyId: null,
  error: null,

  async load() {
    try {
      const data = await api.getFollows();
      set({ ...data, loaded: true, error: null });
    } catch (error) {
      set({
        loaded: true,
        error: error instanceof Error ? error.message : 'Abonnements indisponibles',
      });
    }
  },

  async toggle(artist) {
    const following = get().following.some((item) => item.id === artist.id);
    set({ busyId: artist.id, error: null });
    try {
      if (following) await api.unfollowArtist(artist.id);
      else await api.followArtist(artist.id);
      await get().load();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Action impossible',
      });
    } finally {
      set({ busyId: null });
    }
  },

  reset() {
    set({
      following: [],
      followers: [],
      myArtist: null,
      loaded: false,
      busyId: null,
      error: null,
    });
  },
}));
