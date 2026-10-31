/** Modèle musical — miroir de front/src/types/music.ts. */

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  followers?: number;
  country?: string;
  verified?: boolean;
}

/** Profil artiste complet (espace artiste : édition, bannière, bio…). */
export interface ArtistProfile extends Artist {
  userId: string;
  slug?: string;
  bio?: string;
  bannerUrl?: string;
  country?: string;
  websiteUrl?: string;
  socialLinks?: string;
  verified?: boolean;
  followers: number;
}

/** Données de l'espace artiste : profil + catalogue personnel. */
export interface ArtistDashboard {
  artist: ArtistProfile;
  tracks: Track[];
  totalDurationMs: number;
  referral?: {
    code: string | null;
    count: number;
    required: number;
  };
}

/** Statistiques d'écoute d'un artiste (`GET /api/artists/me/stats`). */
export interface ArtistStats {
  followers: number;
  totals: {
    tracks: number;
    published: number;
    plays: number;
    uniqueListeners: number;
    favorites: number;
    playlistAdds: number;
    listeningMs: number;
  };
  daily: Array<{ date: string; plays: number }>;
  tracks: Array<{
    id: string;
    title: string;
    status: string | null;
    plays: number;
    uniqueListeners: number;
    favorites: number;
    playlistAdds: number;
    lastPlayedAt: string | null;
  }>;
}

/** Champs modifiables du profil artiste. */
export interface ArtistInput {
  name: string;
  bio?: string;
  imageUrl?: string;
  bannerUrl?: string;
  genres?: string;
  country?: string;
  websiteUrl?: string;
  socialLinks?: string;
}

/** Champs modifiables d'un morceau. */
export interface TrackInput {
  title: string;
  album?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  year?: number;
}

export interface Album {
  id: string;
  title: string;
  coverUrl?: string;
  year?: number;
  artist?: Artist;
  trackCount?: number;
}

export interface Track {
  id: string;
  title: string;
  artist: Artist;
  album?: Album;
  coverUrl?: string;
  /** Durée en secondes. */
  duration: number;
  streamUrl?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  plays?: number;
  year?: number;
  /** Identifiant de l'entrée dans une playlist (`playlist_tracks`). */
  playlistEntryId?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  owner?: string;
  tracks: Track[];
}

export interface Shelf {
  id: string;
  title: string;
  subtitle?: string;
  items: Array<Track | Album | Artist | Playlist>;
}

export interface HomeFeed {
  greeting: string;
  shelves: Shelf[];
}

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

export interface Library {
  playlists: Playlist[];
  liked: Track[];
}

export interface HistoryEntry {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  genre?: string;
  durationMs: number;
  playedAt: string;
  track?: Track;
}

export interface Follower {
  id: string;
  name: string;
  avatarUrl?: string;
  followedAt?: string;
}

export interface FollowedArtist extends Artist {
  followId: string;
  followers: number;
}

export interface ProfileFollows {
  following: FollowedArtist[];
  followers: Follower[];
  myArtist: ArtistProfile | null;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type TransitionMode = 'off' | 'automix' | 'crossfade';

/** Vue de l'application. */
export type ViewName = 'home' | 'search' | 'charts' | 'library' | 'artist' | 'profile';

// ------------------------------------------------------------------ gardes

export function isTrack(item: Track | Album | Artist | Playlist): item is Track {
  return 'artist' in item && 'duration' in item;
}

export function isArtist(item: Track | Album | Artist | Playlist): item is Artist {
  return !('tracks' in item) && !('duration' in item) && !('year' in item);
}

export function isPlaylist(item: Track | Album | Artist | Playlist): item is Playlist {
  return 'tracks' in item;
}

export function isAlbum(item: Track | Album | Artist | Playlist): item is Album {
  return !('tracks' in item) && !('duration' in item) && 'year' in item;
}
