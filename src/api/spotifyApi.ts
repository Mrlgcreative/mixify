import type { Album, Artist, HomeFeed, Library, Playlist, SearchResults, Track } from '../types/music';
import type { MusicApi } from './musicApi';
import { spotifyToken } from './spotifyAuth.ts';

/**
 * Adaptateur Spotify — https://developer.spotify.com/documentation/web-api
 *
 * Nécessite une connexion OAuth (voir `spotifyAuth.ts`, flux PKCE sans
 * serveur) : catalogues et bibliothèque sont derrière un jeton utilisateur.
 * Les endpoints utilisés (search, playlists, bibliothèque, écoutes récentes)
 * restent accessibles aux nouvelles applications.
 *
 * shortcut: les extraits de 30 s (`preview_url`) ne sont PLUS fournis aux
 * applications Spotify créées après novembre 2024 — les titres reviennent sans
 * `streamUrl` : les rayons et la recherche les excluent, et un clic dans une
 * playlist remonte la notice « aucun extrait » via `getStreamUrl`. Si votre
 * application dispose des previews (app ancienne ou extension accordée), tout
 * se joue normalement. Aucun endpoint public ne remplace ces extraits.
 *
 * shortcut: une playlist n'est lue que sur ses 100 premiers titres (pagination
 * non câblée : l'auto-mix ne consomme jamais plus d'une poignée de titres).
 */

const BASE = 'https://api.spotify.com/v1';
/** Durée réelle des extraits Spotify (mp3 de 30 s), comme chez iTunes. */
const PREVIEW_SECONDS = 30;

// ------------------------------------------------------------- shapes Spotify

interface SpotifyImage {
  url: string;
}

interface SpotifyArtistRef {
  id: string;
  name: string;
}

interface SpotifyAlbumRef {
  id: string;
  name: string;
  images?: SpotifyImage[];
}

interface SpotifyAlbumObject extends SpotifyAlbumRef {
  release_date?: string;
  total_tracks?: number;
  artists?: SpotifyArtistRef[];
}

interface SpotifyTrackObject {
  id: string;
  name: string;
  duration_ms: number;
  /** `null` pour les applications sans accès aux previews (cf. shortcut). */
  preview_url?: string | null;
  explicit?: boolean;
  artists?: SpotifyArtistRef[];
  album?: SpotifyAlbumRef;
  type?: string;
}

interface SpotifyPlaylistObject {
  id: string;
  name: string;
  description?: string | null;
  images?: SpotifyImage[] | null;
  owner?: { display_name?: string | null };
  tracks?: { items?: Array<{ track?: SpotifyTrackObject | null }> };
}

interface SpotifySearchResponse {
  tracks?: { items?: SpotifyTrackObject[] };
  albums?: { items?: SpotifyAlbumObject[] };
  artists?: {
    items?: Array<SpotifyArtistRef & { images?: SpotifyImage[]; genres?: string[] }>;
  };
  playlists?: { items?: SpotifyPlaylistObject[] };
}

interface SpotifyTrackItem {
  track?: SpotifyTrackObject | null;
}

// ------------------------------------------------------------------- mappers

export function toTrack(spotify: SpotifyTrackObject): Track {
  const names = (spotify.artists ?? []).map((artist) => artist.name).filter(Boolean).join(', ');
  return {
    id: spotify.id,
    title: spotify.name,
    artist: { id: spotify.artists?.[0]?.id ?? 'unknown', name: names || 'Artiste inconnu' },
    album: spotify.album
      ? {
          id: spotify.album.id,
          title: spotify.album.name,
          coverUrl: spotify.album.images?.[0]?.url,
        }
      : undefined,
    // L'extrait ne dure que 30 s : afficher la durée complète figerait la barre
    // de progression à ~12 % (même logique que l'adaptateur iTunes).
    duration: spotify.preview_url ? PREVIEW_SECONDS : Math.round(spotify.duration_ms / 1000),
    streamUrl: spotify.preview_url ?? undefined,
    explicit: spotify.explicit || undefined,
  };
}

export function toAlbum(spotify: SpotifyAlbumObject): Album {
  return {
    id: spotify.id,
    title: spotify.name,
    coverUrl: spotify.images?.[0]?.url,
    year: spotify.release_date ? Number(spotify.release_date.slice(0, 4)) || undefined : undefined,
    trackCount: spotify.total_tracks,
    artist: spotify.artists?.length
      ? { id: spotify.artists[0].id, name: spotify.artists[0].name }
      : undefined,
  };
}

export function toArtist(spotify: { id: string; name: string; images?: SpotifyImage[]; genres?: string[] }): Artist {
  return {
    id: spotify.id,
    name: spotify.name,
    imageUrl: spotify.images?.[0]?.url,
    genres: spotify.genres?.length ? spotify.genres : undefined,
  };
}

/** Descriptions Spotify contiennent du HTML (`<a href=...>`). */
const stripHtml = (text: string | null | undefined): string | undefined =>
  text?.replace(/<[^>]+>/g, '').trim() || undefined;

export function toPlaylist(spotify: SpotifyPlaylistObject): Playlist {
  const tracks = (spotify.tracks?.items ?? [])
    .map((item) => item.track)
    .filter((track): track is SpotifyTrackObject => !!track && track.type !== 'episode')
    .map(toTrack);
  return {
    id: spotify.id,
    title: spotify.name,
    description: stripHtml(spotify.description),
    coverUrl: spotify.images?.[0]?.url ?? tracks[0]?.album?.coverUrl,
    owner: spotify.owner?.display_name ?? undefined,
    tracks,
  };
}

/** Titres d'une liste d'objets `{ track }` (bibliothèque, écoutes récentes…). */
function tracksFromItems(items: SpotifyTrackItem[]): Track[] {
  return items
    .map((item) => item.track)
    .filter((track): track is SpotifyTrackObject => !!track && track.type !== 'episode')
    .map(toTrack)
    // Un titre sans extrait serait injouable au milieu de la file d'attente.
    .filter((track) => track.streamUrl);
}

// --------------------------------------------------------------------- API

export class SpotifyMusicApi implements MusicApi {
  private async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const token = await spotifyToken();
    if (!token) throw new Error('Spotify : connecte ton compte (aucun jeton).');

    const url = new URL(`${BASE}${path}`);
    for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, String(value));

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Spotify ${response.status} sur ${path}`);
    return (await response.json()) as T;
  }

  async getHome(): Promise<HomeFeed> {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

    const [recent, liked, playlists] = await Promise.all([
      this.get<{ items?: SpotifyTrackItem[] }>('/me/player/recently-played', { limit: 12 }),
      this.get<{ items?: SpotifyTrackItem[] }>('/me/tracks', { limit: 12 }),
      this.get<{ items?: SpotifyPlaylistObject[] }>('/me/playlists', { limit: 12 }),
    ]);

    return {
      greeting,
      shelves: [
        { id: 'shelf-recent', title: 'Récemment écoutés', items: tracksFromItems(recent.items ?? []) },
        { id: 'shelf-liked', title: 'Titres likés', items: tracksFromItems(liked.items ?? []) },
        {
          id: 'shelf-playlists',
          title: 'Vos playlists',
          items: (playlists.items ?? []).map(toPlaylist),
        },
      ],
    };
  }

  async search(query: string): Promise<SearchResults> {
    const terms = query.trim();
    if (!terms) return { tracks: [], albums: [], artists: [], playlists: [] };

    const payload = await this.get<SpotifySearchResponse>('/search', {
      q: terms,
      type: 'track,album,artist,playlist',
      limit: 20,
    });

    return {
      tracks: (payload.tracks?.items ?? []).map(toTrack).filter((track) => track.streamUrl),
      albums: (payload.albums?.items ?? []).map(toAlbum),
      artists: (payload.artists?.items ?? []).map(toArtist),
      playlists: (payload.playlists?.items ?? []).map(toPlaylist),
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    // La réponse embarque déjà la première page de titres (100 max, cf. shortcut).
    const playlist = await this.get<SpotifyPlaylistObject>(`/playlists/${encodeURIComponent(id)}`);
    return toPlaylist(playlist);
  }

  async getLibrary(): Promise<Library> {
    const [playlists, liked] = await Promise.all([
      this.get<{ items?: SpotifyPlaylistObject[] }>('/me/playlists', { limit: 20 }),
      this.get<{ items?: SpotifyTrackItem[] }>('/me/tracks', { limit: 50 }),
    ]);
    return {
      playlists: (playlists.items ?? []).map(toPlaylist),
      liked: tracksFromItems(liked.items ?? []),
    };
  }

  /** L'extrait est déjà dans `preview_url` ; sans lui le titre est injouable. */
  async getStreamUrl(track: Track): Promise<string> {
    if (!track.streamUrl) {
      throw new Error(
        `Spotify : aucun extrait pour le titre ${track.id} (previews retirés aux nouvelles applications)`,
      );
    }
    return track.streamUrl;
  }
}
