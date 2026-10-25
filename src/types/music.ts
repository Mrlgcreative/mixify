/**
 * Modèle de données musical — mirrors the shape of a typical REST API payload.
 * Every field the UI needs is optional so that a real backend can evolve
 * independently from the frontend (partial payloads are tolerated).
 */

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  followers?: number;
  /** Pays ou ville déclarés (ex. « Kolwezi, RDC »). */
  country?: string;
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
}

/** Statistiques d'écoute d'un artiste (miroir de `GET /api/artists/me/stats`). */
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
  /** 30 jours UTC glissants, du plus ancien au plus récent. */
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

/** Transition recommandée par l'IA pour une paire de morceaux consécutifs. */
export interface MixTransition {
  style: 'blend' | 'bass_swap' | 'filter_sweep' | 'echo_out' | 'cut';
  /** Durée du fondu en secondes (1–16 côté backend, ~0,08 pour un cut). */
  duration: number;
  tempoSync: boolean;
  reason: string | null;
}

/** Plan de mix : ordre de passage + transition indexée par `from->to`. */
export interface MixPlan {
  order: string[];
  transitions: Record<string, MixTransition>;
}

/** Champs modifiables du profil artiste. */
export interface ArtistInput {
  name: string;
  bio?: string;
  imageUrl?: string;
  bannerUrl?: string;
  /** Genres séparés par des virgules (format stocké par le backend). */
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
  /** Durée en secondes. */
  duration: number;
  /** URL de streaming déjà résolue (l'API peut aussi l'exposer via getStreamUrl). */
  streamUrl?: string;
  /** BPM : utilisé par l'Auto-Mix pour synchroniser le tempo (beat-sync). */
  bpm?: number;
  /** Tonalité, affichée dans le panneau latéral. */
  key?: string;
  /** Genre musical (texte libre). */
  genre?: string;
  /** Écoutes des 7 derniers jours (tous comptes), quand l'API les fournit. */
  plays?: number;
  year?: number;
  explicit?: boolean;
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

/** Élément d'un rayon (caroussel) de la page d'accueil. */
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

/** Contenu de la bibliothèque de l'utilisateur. */
export interface Library {
  playlists: Playlist[];
  liked: Track[];
}

/** Entrée de l'historique d'écoute (module profil). */
export interface HistoryEntry {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  genre?: string;
  durationMs: number;
  playedAt: string;
  /** Morceau du catalogue (absent pour un morceau externe). */
  track?: Track;
}

/** Compte qui suit le profil artiste de l'utilisateur. */
export interface Follower {
  id: string;
  name: string;
  avatarUrl?: string;
  followedAt?: string;
}

/** Artiste suivi par l'utilisateur. */
export interface FollowedArtist extends Artist {
  followId: string;
  followers: number;
}

/** Abonnements et abonnés du compte connecté. */
export interface ProfileFollows {
  following: FollowedArtist[];
  followers: Follower[];
  /** Profil artiste du compte, s'il existe. */
  myArtist: ArtistProfile | null;
}

export type RepeatMode = 'off' | 'all' | 'one';

/** Vue de l'application (pas de router : navigation locale pilotée par l'état). */
export type ViewName = 'home' | 'search' | 'library' | 'artist' | 'profile';
/** État du lecteur — miroir du store Zustand. */
export interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  /** Position courante en secondes. */
  position: number;
  /** Durée du titre courant en secondes. */
  duration: number;
  autoMix: boolean;
  crossfadeSeconds: number;
}
