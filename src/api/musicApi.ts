import type { HomeFeed, Library, Playlist, SearchResults, Track } from '../types/music';
import {
  demoAlbums,
  demoArtists,
  demoLikedTracks,
  demoPlaylists,
  demoTracks,
} from './demoCatalog';
import { getDemoStreamUrl } from './demoAudio';
import { ItunesMusicApi } from './itunesApi';
import { JamendoMusicApi } from './jamendoApi';
import { SpotifyMusicApi } from './spotifyApi';

/**
 * Abstraction de l'API musicale.
 *
 * Le front n'a jamais besoin de connaître la source des données : il consomme
 * l'interface `MusicApi`. Cinq implémentations sont fournies :
 *   - `ItunesMusicApi`  : classements/extraits iTunes (par défaut : sans clé) ;
 *   - `JamendoMusicApi` : catalogue public Jamendo (gratuit, client_id unique) ;
 *   - `SpotifyMusicApi` : compte Spotify (OAuth PKCE, client_id requis) ;
 *   - `HttpMusicApi`    : backend REST (+ WebSocket d'événements) ;
 *   - `DemoMusicApi`    : catalogue local + audio synthétisé, pour tourner sans
 *     aucun serveur.
 *
 * Le choix se fait via l'environnement (voir .env.example) :
 * `VITE_API_BASE_URL` d'abord (le backend de l'utilisateur gagne), puis
 * `VITE_MUSIC_API` (`demo` | `jamendo` | `spotify` | `itunes`), iTunes par
 * défaut — seule source sans clé. `jamendo` sans `VITE_JAMENDO_CLIENT_ID` et
 * `spotify` sans `VITE_SPOTIFY_CLIENT_ID` retombent sur iTunes.
 */

export interface ServerEvent {
  type: 'now-playing' | 'queue-update' | 'lyrics' | 'error';
  payload: unknown;
}

export interface MusicApi {
  /** Contenu de la page d'accueil (bannière + rayons). */
  getHome(): Promise<HomeFeed>;
  /** Recherche multi-catégories. */
  search(query: string): Promise<SearchResults>;
  /** Détail d'une playlist. */
  getPlaylist(id: string): Promise<Playlist>;
  /** Bibliothèque de l'utilisateur (playlists + titres likés). */
  getLibrary(): Promise<Library>;
  /** URL de streaming d'un titre (CDN, backend, etc.). */
  getStreamUrl(track: Track): Promise<string>;
  /** Abonnement optionnel aux événements serveur (WebSocket). */
  subscribe?(onEvent: (event: ServerEvent) => void): () => void;
}

// ---------------------------------------------------------------- HTTP client

export class HttpMusicApi implements MusicApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`API ${response.status} sur ${path}`);
    return (await response.json()) as T;
  }

  getHome(): Promise<HomeFeed> {
    return this.request<HomeFeed>('/home');
  }

  search(query: string): Promise<SearchResults> {
    return this.request<SearchResults>(`/search?q=${encodeURIComponent(query)}`);
  }

  getPlaylist(id: string): Promise<Playlist> {
    return this.request<Playlist>(`/playlists/${encodeURIComponent(id)}`);
  }

  getLibrary(): Promise<Library> {
    return this.request<Library>('/library');
  }

  async getStreamUrl(track: Track): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    const { url } = await this.request<{ url: string }>(
      `/tracks/${encodeURIComponent(track.id)}/stream`,
    );
    return url;
  }

  subscribe(onEvent: (event: ServerEvent) => void): () => void {
    const wsUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (!wsUrl) return () => undefined;
    const socket = new WebSocket(wsUrl);
    socket.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data as string) as ServerEvent);
      } catch {
        /* message illisible : on l'ignore */
      }
    };
    return () => socket.close();
  }
}

// ----------------------------------------------------------------- Demo mode

export class DemoMusicApi implements MusicApi {
  async getHome(): Promise<HomeFeed> {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
    return {
      greeting,
      shelves: [
        {
          id: 'shelf-fresh',
          title: 'Nouveautés pour vous',
          subtitle: 'Fraîchement sorties',
          items: demoTracks.slice(0, 6),
        },
        {
          id: 'shelf-mix',
          title: 'Mix automatique',
          subtitle: 'Enchaînés pour un passage fluide',
          items: demoPlaylists,
        },
        {
          id: 'shelf-albums',
          title: 'Albums du moment',
          items: demoAlbums,
        },
        {
          id: 'shelf-focus',
          title: 'Pour rester dans le flow',
          items: demoTracks.slice(6, 12),
        },
        {
          id: 'shelf-artists',
          title: 'Artistes à suivre',
          items: demoArtists,
        },
      ],
    };
  }

  async search(query: string): Promise<SearchResults> {
    const q = query.trim().toLowerCase();
    const match = (value: string) => value.toLowerCase().includes(q);
    return {
      tracks: demoTracks.filter((t) => match(t.title) || match(t.artist.name)),
      albums: demoAlbums.filter((a) => match(a.title) || match(a.artist?.name ?? '')),
      artists: demoArtists.filter((a) => match(a.name)),
      playlists: demoPlaylists.filter((p) => match(p.title)),
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    const playlist = demoPlaylists.find((p) => p.id === id);
    if (!playlist) throw new Error(`Playlist inconnue : ${id}`);
    return playlist;
  }

  async getLibrary(): Promise<Library> {
    return { playlists: demoPlaylists, liked: demoLikedTracks };
  }

  async getStreamUrl(track: Track): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    return getDemoStreamUrl(track);
  }
}

// ----------------------------------------------------------------- Singleton

const mode = (import.meta.env.VITE_MUSIC_API as string | undefined)?.trim().toLowerCase();
const jamendoClientId = (import.meta.env.VITE_JAMENDO_CLIENT_ID as string | undefined)?.trim();
const spotifyClientId = (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim();
const baseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

/** Source retenue : backend > démo > Jamendo > Spotify > iTunes (défaut sans clé). */
const source = baseUrl
  ? 'http'
  : mode === 'demo'
    ? 'demo'
    : mode === 'jamendo' && jamendoClientId
      ? 'jamendo'
      : mode === 'spotify' && spotifyClientId
        ? 'spotify'
        : 'itunes';

export const api: MusicApi =
  source === 'http'
    ? new HttpMusicApi(baseUrl as string)
    : source === 'demo'
      ? new DemoMusicApi()
      : source === 'jamendo'
        ? new JamendoMusicApi(jamendoClientId as string)
        : source === 'spotify'
          ? new SpotifyMusicApi()
          : new ItunesMusicApi();

export const isDemoMode = source === 'demo';
export const isSpotifyMode = source === 'spotify';
