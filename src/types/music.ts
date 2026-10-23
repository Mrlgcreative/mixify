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
  verified: boolean;
  followers: number;
}

/** Données de l'espace artiste : profil + catalogue personnel. */
export interface ArtistDashboard {
  artist: ArtistProfile;
  tracks: Track[];
  totalDurationMs: number;
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

export type RepeatMode = 'off' | 'all' | 'one';

/** Vue de l'application (pas de router : navigation locale pilotée par l'état). */
export type ViewName = 'home' | 'search' | 'library' | 'artist';
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
