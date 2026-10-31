import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { followArtist, getFollows, unfollowArtist } from '@/api/musicApi';
import type { Artist, ArtistProfile, Follower, FollowedArtist } from '@/types/music';
import { useAuth } from './auth';

interface FollowsContextValue {
  following: FollowedArtist[];
  followers: Follower[];
  myArtist: ArtistProfile | null;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  isFollowing: (artistId: string) => boolean;
  toggleFollow: (artist: Artist) => Promise<void>;
  reset: () => void;
}

const FollowsContext = createContext<FollowsContextValue | null>(null);

/** Abonnements du compte, partagés entre recherche, profil et fiches artiste. */
export function FollowsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState<FollowedArtist[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [myArtist, setMyArtist] = useState<ArtistProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Réinitialise pendant le rendu quand la session se ferme.
  const [owner, setOwner] = useState(user);
  if (user !== owner) {
    setOwner(user);
    if (!user) {
      setFollowing([]);
      setFollowers([]);
      setMyArtist(null);
      setLoaded(false);
    }
  }

  const reset = useCallback(() => {
    setFollowing([]);
    setFollowers([]);
    setMyArtist(null);
    setLoaded(false);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await getFollows();
      setFollowing(data.following);
      setFollowers(data.followers);
      setMyArtist(data.myArtist);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Abonnements indisponibles');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial lié au compte
    void load();
  }, [user, load]);

  const isFollowing = useCallback(
    (artistId: string) => following.some((artist) => artist.id === artistId),
    [following],
  );

  const toggleFollow = useCallback(
    async (artist: Artist) => {
      const existing = following.find((item) => item.id === artist.id);
      if (existing) {
        setFollowing((current) => current.filter((item) => item.id !== artist.id));
        try {
          await unfollowArtist(artist.id);
        } catch (cause) {
          setFollowing((current) => [...current, existing]);
          setError(cause instanceof Error ? cause.message : 'Désabonnement impossible');
        }
        return;
      }

      const optimistic: FollowedArtist = {
        ...artist,
        followId: `en-cours-${artist.id}`,
        followers: artist.followers ?? 0,
      };
      setFollowing((current) => [...current, optimistic]);
      try {
        await followArtist(artist.id);
        await load();
      } catch (cause) {
        setFollowing((current) => current.filter((item) => item.id !== artist.id));
        setError(cause instanceof Error ? cause.message : 'Abonnement impossible');
      }
    },
    [following, load],
  );

  const value = useMemo(
    () => ({
      following,
      followers,
      myArtist,
      loaded,
      error,
      load,
      isFollowing,
      toggleFollow,
      reset,
    }),
    [following, followers, myArtist, loaded, error, load, isFollowing, toggleFollow, reset],
  );

  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows(): FollowsContextValue {
  const context = useContext(FollowsContext);
  if (!context) throw new Error('useFollows doit être utilisé dans FollowsProvider');
  return context;
}
