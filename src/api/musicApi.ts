import type { AuthUser, Role } from '../types/auth';
import type {
  Artist,
  ArtistDashboard,
  ArtistInput,
  ArtistProfile,
  ArtistStats,
  FollowedArtist,
  HistoryEntry,
  HomeFeed,
  Library,
  MixPlan,
  MixTransition,
  Playlist,
  ProfileFollows,
  SearchResults,
  Shelf,
  Track,
  TrackInput,
} from '../types/music';

/**
 * Client du backend Mixify (Next.js, routes `/api/...`).
 *
 * Le front ne connaît que les types internes (`src/types/music.ts`) : ce module
 * mappe les réponses brutes (snake_case, durées en ms) vers ces types.
 * Session : token JWT en localStorage, envoyé en `Authorization: Bearer`.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(
  /\/$/,
  '',
);

const TOKEN_KEY = 'mixify.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* stockage indisponible (mode privé) : session non persistée */
  }
}

/** URL de départ de la connexion Google (retour sur le front avec #token=…). */
export function googleLoginUrl(role?: Role): string {
  const query = role === 'artiste' ? '?role=artiste' : '';
  return `${BASE_URL}/api/auth/google${query}`;
}

/** Résultat du retour Google (#token=… / #error=…), puis nettoie l'URL. */
export function takeAuthCallback(): { token?: string; error?: string } {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.has('token') && !params.has('error')) return {};
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );
  return {
    token: params.get('token') ?? undefined,
    error: params.get('error') ?? undefined,
  };
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
  }

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new ApiError(payload?.error ?? `Erreur ${response.status}`, response.status);
  }
  return payload as T;
}

/** Erreur HTTP du backend (permet de distinguer un jeton invalide d'une panne). */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * PUT du fichier vers R2 avec progression.
 * `fetch` ne remonte pas l'avancement d'un envoi : XMLHttpRequest le fait.
 */
function putFile(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Téléversement refusé par R2 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Téléversement interrompu — vérifiez la connexion'));
    xhr.onabort = () => reject(new Error('Téléversement annulé'));
    xhr.send(file);
  });
}

// ----------------------------------------------------------- formes backend

interface ApiArtist {
  id: string;
  name: string;
  image_url: string | null;
  genres: string | null;
  user_id?: string | null;
  slug?: string | null;
  bio?: string | null;
  banner_url?: string | null;
  country?: string | null;
  website_url?: string | null;
  social_links?: string | null;
  verified?: boolean | null;
  followers_count?: number | null;
}

interface ApiTrack {
  id: string;
  title: string;
  artist_id: string | null;
  artiste: string | null;
  /** Profil complet de l'artiste quand l'API l'enrichit (badge certifié). */
  artiste_info?: ApiArtist | null;
  album: string | null;
  cover_url: string | null;
  duration_ms: number | null;
  audio_url: string | null;
  bpm: number | null;
  key: string | null;
  year: number | null;
  genre?: string | null;
  /** Écoutes sur la fenêtre demandée (`?stats=1&period=…`). */
  plays?: number | null;
  /** Ancien nom du compteur 7 jours, gardé pendant le déploiement. */
  plays_7d?: number | null;
  created_at?: string | null;
}

interface ApiPlaylist {
  id: string;
  nom: string;
  nb_morceaux?: number;
}

interface ApiFavorite {
  id: string;
  track_id?: string | null;
  titre: string;
  artiste: string | null;
  track: ApiTrack | null;
}

interface ApiHistoryEntry {
  id: string;
  titre: string;
  artiste: string | null;
  cover: string | null;
  genre: string | null;
  duration_ms: number | null;
  played_at: string;
  track: ApiTrack | null;
}

interface ApiFollowedArtist extends ApiArtist {
  follow_id: string;
}

interface ApiFollower {
  id: string;
  name: string | null;
  avatar_url: string | null;
  followed_at?: string | null;
}

interface ApiFollows {
  following: ApiFollowedArtist[];
  followers: ApiFollower[];
  my_artist: ApiArtist | null;
}

// ---------------------------------------------------------------- mappages

function toArtist(raw: ApiArtist): Artist {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image_url ?? undefined,
    genres: raw.genres
      ? raw.genres
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean)
      : undefined,
    followers: raw.followers_count ?? undefined,
    country: raw.country ?? undefined,
  };
}

function toArtistProfile(raw: ApiArtist): ArtistProfile {
  return {
    ...toArtist(raw),
    userId: raw.user_id ?? '',
    slug: raw.slug ?? undefined,
    bio: raw.bio ?? undefined,
    bannerUrl: raw.banner_url ?? undefined,
    country: raw.country ?? undefined,
    websiteUrl: raw.website_url ?? undefined,
    socialLinks: raw.social_links ?? undefined,
    verified: raw.verified === true,
    followers: raw.followers_count ?? 0,
  };
}

function toTrack(raw: ApiTrack): Track {
  const artist: Artist = {
    id: raw.artist_id ?? '',
    name: raw.artiste ?? 'Artiste inconnu',
    verified: raw.artiste_info?.verified === true,
  };
  return {
    id: raw.id,
    title: raw.title,
    artist,
    coverUrl: raw.cover_url ?? undefined,
    album: raw.album
      ? {
          id: `${raw.artist_id ?? 'inconnu'}:${raw.album}`,
          title: raw.album,
          coverUrl: raw.cover_url ?? undefined,
          year: raw.year ?? undefined,
          artist,
        }
      : undefined,
    duration: (raw.duration_ms ?? 0) / 1000,
    streamUrl: raw.audio_url ?? undefined,
    bpm: raw.bpm ?? undefined,
    key: raw.key ?? undefined,
    genre: raw.genre ?? undefined,
    plays: raw.plays ?? raw.plays_7d ?? undefined,
    year: raw.year ?? undefined,
  };
}

function toPlaylist(raw: ApiPlaylist): Playlist {
  return {
    id: raw.id,
    title: raw.nom,
    description: raw.nb_morceaux === undefined ? undefined : `${raw.nb_morceaux} titres`,
    tracks: [],
  };
}

/** Morceau favori : catalogue complet, ou simple cache pour un morceau externe. */
function toLikedTrack(raw: ApiFavorite): Track {
  if (raw.track) return toTrack(raw.track);
  return {
    id: `favori-${raw.id}`,
    title: raw.titre,
    artist: { id: '', name: raw.artiste ?? 'Artiste inconnu' },
    duration: 0,
  };
}

/** Ligne d'historique : le morceau du catalogue prime sur les métadonnées en cache. */
function toHistoryEntry(raw: ApiHistoryEntry): HistoryEntry {
  return {
    id: raw.id,
    title: raw.track?.title ?? raw.titre,
    artist: raw.track?.artiste ?? raw.artiste ?? 'Artiste inconnu',
    coverUrl: raw.track?.cover_url ?? raw.cover ?? undefined,
    genre: raw.track?.genre ?? raw.genre ?? undefined,
    durationMs: raw.track?.duration_ms ?? raw.duration_ms ?? 0,
    playedAt: raw.played_at,
    track: raw.track ? toTrack(raw.track) : undefined,
  };
}

function toProfileFollows(raw: ApiFollows): ProfileFollows {
  const following: FollowedArtist[] = raw.following.map((artist) => ({
    ...toArtist(artist),
    followId: artist.follow_id,
    followers: artist.followers_count ?? 0,
  }));

  return {
    following,
    followers: raw.followers.map((account) => ({
      id: account.id,
      name: account.name ?? 'Auditeur',
      avatarUrl: account.avatar_url ?? undefined,
      followedAt: account.followed_at ?? undefined,
    })),
    myArtist: raw.my_artist ? toArtistProfile(raw.my_artist) : null,
  };
}

// ------------------------------------------------------------------- client

/** Fenêtre du classement : semaine, mois ou année. */
export type ChartPeriod = 'week' | 'month' | 'year';

export interface MusicApi {
  getHome(): Promise<HomeFeed>;
  /** Classement des titres les plus écoutés sur la période (semaine/mois/année). */
  getChart(period: ChartPeriod): Promise<Track[]>;
  search(query: string): Promise<SearchResults>;
  getPlaylist(id: string): Promise<Playlist>;
  getLibrary(): Promise<Library>;
  getStreamUrl(track: Track): Promise<string>;
  getTracks(): Promise<Track[]>;
  /** Historique d'écoute du compte (200 dernières écoutes). */
  getHistory(): Promise<HistoryEntry[]>;
  /** Enregistre une écoute ; silencieux si le backend est injoignable. */
  recordHistory(track: Track): Promise<void>;
  clearHistory(): Promise<void>;
  /** Abonnements et abonnés du compte. */
  getFollows(): Promise<ProfileFollows>;
  followArtist(artistId: string): Promise<void>;
  unfollowArtist(artistId: string): Promise<void>;
  /** Met à jour le profil public (nom, bio, avatar). */
  updateProfile(input: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  }): Promise<AuthUser>;
  /** Favoris de l'utilisateur : `track_id` -> identifiant du favori. */
  getFavoriteIds(): Promise<Record<string, string>>;
  addFavorite(trackId: string): Promise<string>;
  removeFavorite(favoriteId: string): Promise<void>;
  createPlaylist(nom: string): Promise<void>;
  renamePlaylist(id: string, nom: string): Promise<void>;
  deletePlaylist(id: string): Promise<void>;
  addTrackToPlaylist(playlistId: string, trackId: string): Promise<void>;
  removeTrackFromPlaylist(playlistTrackId: string): Promise<void>;
  /** Ordre et transitions d'un mix IA (rejette si l'appel échoue : la lecture continue en local). */
  getMixPlan(trackIds: string[]): Promise<MixPlan>;
  /** Téléverse une image (avatar / pochette / bannière) vers R2. */
  uploadImage(file: File, folder?: string): Promise<string>;
  /** Téléverse le fichier vers R2 puis publie le morceau au catalogue. */
  uploadTrack(
    file: File,
    input: PublishInput,
    onStage?: (stage: PublishStage) => void,
    onProgress?: (percent: number) => void,
  ): Promise<Track>;
  /** Profil artiste + catalogue du compte connecté (null s'il n'y a pas encore de profil). */
  getMyArtist(): Promise<ArtistDashboard | null>;
  /** Vue d'ensemble des écoutes du catalogue (null s'il n'y a pas encore de profil). */
  /** Profil public d'un artiste (bio, photo, pays, badge). */
  getArtist(id: string): Promise<ArtistProfile>;
  getArtistStats(): Promise<ArtistStats | null>;
  createArtist(input: ArtistInput): Promise<ArtistProfile>;
  updateArtist(id: string, input: ArtistInput): Promise<ArtistProfile>;
  updateTrack(id: string, input: TrackInput): Promise<void>;
  deleteTrack(id: string): Promise<void>;
}

/** Étapes visibles du pipeline de publication. */
export type PublishStage = 'upload' | 'check';

/** Champs saisis lors de la publication d'un morceau. */
export interface PublishInput {
  title: string;
  album?: string;
  bpm?: number;
  year?: number;
  /** Durée en secondes, lue par le lecteur avant l'envoi. */
  duration?: number;
  /** Pochette déjà téléversée (`api.uploadImage`). */
  coverUrl?: string;
}

/** Champs artiste au format attendu par le backend (snake_case). */
function toApiArtistFields(input: ArtistInput) {
  return {
    name: input.name,
    bio: input.bio || null,
    image_url: input.imageUrl || null,
    banner_url: input.bannerUrl || null,
    genres: input.genres || null,
    country: input.country || null,
    website_url: input.websiteUrl || null,
    social_links: input.socialLinks || null,
  };
}

class MixifyApi implements MusicApi {
  /** Playlists de l'utilisateur connecté (vide sans session). */
  private async myPlaylists(): Promise<Playlist[]> {
    if (!getToken()) return [];
    const { playlists } = await request<{ playlists: ApiPlaylist[] }>('/api/playlists');
    return playlists.map(toPlaylist);
  }

  async getHome(): Promise<HomeFeed> {
    const [{ tracks }, { artists }, playlists] = await Promise.all([
      request<{ tracks: ApiTrack[] }>('/api/tracks?stats=1'),
      request<{ artists: ApiArtist[] }>('/api/artists'),
      this.myPlaylists().catch(() => []),
    ]);

    const mappedTracks = tracks.map(toTrack);
    const mappedArtists = artists.map(toArtist);
    const withTempo = mappedTracks.filter((track) => track.bpm);
    const byPlays = (a: Track, b: Track) => (b.plays ?? 0) - (a.plays ?? 0);
    const hour = new Date().getHours();

    // Scène locale : artistes de Kolwezi / RDC (pays ou genres renseignés).
    const localArtists = mappedArtists.filter((artist) =>
      /kolwezi|rdc|congo|lualaba/i.test(
        `${artist.country ?? ''} ${(artist.genres ?? []).join(' ')}`,
      ),
    );
    const localIds = new Set(localArtists.map((artist) => artist.id));
    const localTracks = mappedTracks.filter((track) => localIds.has(track.artist.id));

    const shelves: Shelf[] = [];
    if (localArtists.length > 0) {
      shelves.push({
        id: 'kolwezi',
        title: 'Scène de Kolwezi',
        subtitle: 'Les voix et les pochettes de la région',
        items: [...localTracks, ...localArtists],
      });
    }

    // Ce que la région écoute : classement par écoutes réelles des 7 derniers
    // jours (`plays` fourni par GET /api/tracks?stats=1).
    const localHot = localTracks
      .filter((track) => (track.plays ?? 0) > 0)
      .sort(byPlays)
      .slice(0, 20);
    if (localHot.length >= 2) {
      shelves.push({
        id: 'kolwezi-hot',
        title: 'Ce que Kolwezi écoute',
        subtitle: 'Les titres les plus joués cette semaine',
        items: localHot,
      });
    }

    // Genres locaux mis en avant : rumba, ndombolo, gospel, amapiano, rap.
    const localGenres = [
      { id: 'rumba', title: 'Rumba congolaise', subtitle: 'Guitares et voix de la RDC', pattern: /rumba/i },
      { id: 'ndombolo', title: 'Ndombolo', subtitle: 'Le rythme qui fait danser Kolwezi', pattern: /ndombolo/i },
      { id: 'gospel', title: 'Gospel', subtitle: 'Louange et espoir', pattern: /gospel/i },
      { id: 'amapiano', title: 'Amapiano', subtitle: 'Log drums et nuits chaudes', pattern: /amapiano/i },
      { id: 'rap', title: 'Rap congolais', subtitle: 'Les nouvelles plumes de Kolwezi', pattern: /\brap\b/i },
    ];
    for (const genre of localGenres) {
      const genreTracks = mappedTracks.filter((track) => genre.pattern.test(track.genre ?? ''));
      const genreArtists = mappedArtists.filter((artist) =>
        (artist.genres ?? []).some((value) => genre.pattern.test(value)),
      );
      if (genreTracks.length > 0 || genreArtists.length > 0) {
        shelves.push({
          id: genre.id,
          title: genre.title,
          subtitle: genre.subtitle,
          items: [...genreTracks, ...genreArtists],
        });
      }
    }

    // Émergents : artistes locaux encore peu suivis, du plus petit au plus grand.
    const emerging = localArtists
      .filter((artist) => (artist.followers ?? 0) < 1000)
      .sort((a, b) => (a.followers ?? 0) - (b.followers ?? 0));
    if (emerging.length > 0) {
      shelves.push({
        id: 'emergents',
        title: 'Artistes émergents de Kolwezi',
        subtitle: 'Les nouveaux talents à suivre',
        items: emerging,
      });
    }

    // Playlists par ambiance / occasion : remplies par genre, classées par les
    // écoutes récentes (même signal que « Ce que Kolwezi écoute »).
    const occasions = [
      { id: 'mariage', title: 'Mariage', pattern: /rumba|ndombolo|slow|zouk|love|afro/i },
      { id: 'eglise', title: 'Église', pattern: /gospel|louange|worship|adoration|chr[eé]tien/i },
      { id: 'soiree', title: 'Soirée', pattern: /ndombolo|amapiano|rap|dance|afro|électro|electro|coup[ée]/i },
    ];
    const moods: Playlist[] = [];
    for (const occasion of occasions) {
      const picks = mappedTracks
        .filter((track) => occasion.pattern.test(track.genre ?? ''))
        .sort(byPlays)
        .slice(0, 20);
      if (picks.length < 2) continue;
      moods.push({
        id: `ambiance-${occasion.id}`,
        title: occasion.title,
        description: picks.some((track) => (track.plays ?? 0) > 0)
          ? `${picks.length} titres · les plus écoutés`
          : `${picks.length} titres`,
        tracks: picks,
      });
    }
    if (moods.length > 0) {
      shelves.push({
        id: 'ambiances',
        title: 'Ambiances & occasions',
        subtitle: 'Mariage, église, soirée',
        items: moods,
      });
    }

    shelves.push(
      {
        id: 'nouveautes',
        title: 'Nouveautés',
        subtitle: 'Derniers morceaux publiés',
        items: mappedTracks,
      },
      {
        id: 'tempo',
        title: 'Mix par tempo',
        subtitle: 'Enchaînement du plus lent au plus rapide',
        items: [...withTempo].sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0)),
      },
      {
        id: 'artistes',
        title: 'Artistes',
        subtitle: 'Les profils du catalogue',
        items: mappedArtists,
      },
    );
    if (playlists.length > 0) {
      shelves.push({
        id: 'playlists',
        title: 'Vos playlists',
        subtitle: 'Votre bibliothèque',
        items: playlists,
      });
    }

    return {
      greeting: hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir',
      shelves: shelves.filter((shelf) => shelf.items.length > 0),
    };
  }

  async search(query: string): Promise<SearchResults> {
    const q = query.trim();
    const [{ tracks }, { artists }, playlists] = await Promise.all([
      request<{ tracks: ApiTrack[] }>(`/api/tracks?search=${encodeURIComponent(q)}`),
      request<{ artists: ApiArtist[] }>(`/api/artists?search=${encodeURIComponent(q)}`),
      this.myPlaylists().catch(() => []),
    ]);
    const needle = q.toLowerCase();

    return {
      tracks: tracks.map(toTrack),
      albums: [],
      artists: artists.map(toArtist),
      playlists: playlists.filter((playlist) => playlist.title.toLowerCase().includes(needle)),
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    const { playlist, morceaux } = await request<{
      playlist: ApiPlaylist;
      morceaux: Array<{ id: string; track: ApiTrack | null }>;
    }>(`/api/playlists/${encodeURIComponent(id)}`);

    return {
      ...toPlaylist(playlist),
      tracks: morceaux
        .filter((entry): entry is { id: string; track: ApiTrack } => entry.track !== null)
        .map((entry) => ({
          ...toTrack(entry.track),
          playlistEntryId: entry.id,
        })),
    };
  }

  async getLibrary(): Promise<Library> {
    if (!getToken()) {
      throw new Error('Connectez-vous pour accéder à votre bibliothèque');
    }
    const [{ favorites }, playlists] = await Promise.all([
      request<{ favorites: ApiFavorite[] }>('/api/favorites'),
      this.myPlaylists(),
    ]);

    return {
      playlists,
      liked: (favorites ?? []).map(toLikedTrack),
    };
  }

  async getStreamUrl(track: Track): Promise<string> {
    if (track.streamUrl) return track.streamUrl;
    const { track: raw } = await request<{ track: ApiTrack }>(
      `/api/tracks/${encodeURIComponent(track.id)}`,
    );
    if (!raw?.audio_url) throw new Error(`Aucun fichier audio pour « ${track.title} »`);
    return raw.audio_url;
  }

  async getTracks(): Promise<Track[]> {
    const { tracks } = await request<{ tracks: ApiTrack[] }>('/api/tracks');
    return tracks.map(toTrack);
  }

  async getChart(period: ChartPeriod): Promise<Track[]> {
    const { tracks } = await request<{ tracks: ApiTrack[] }>(
      `/api/tracks?stats=1&period=${period}`,
    );
    return tracks
      .map(toTrack)
      .filter((track) => (track.plays ?? 0) > 0)
      .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
  }

  async getHistory(): Promise<HistoryEntry[]> {
    if (!getToken()) return [];
    const { history } = await request<{ history: ApiHistoryEntry[] }>('/api/history');
    return (history ?? []).map(toHistoryEntry);
  }

  async recordHistory(track: Track): Promise<void> {
    if (!getToken()) return;
    // Les morceaux du catalogue ont un id UUID ; les ids externes (Jamendo…)
    // sont conservés dans external_id pour ne pas casser la clé étrangère.
    const isCatalogId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      track.id,
    );
    try {
      await request('/api/history', {
        method: 'POST',
        body: JSON.stringify({
          track_id: isCatalogId ? track.id : null,
          external_id: isCatalogId ? null : track.id,
          titre: track.title,
          artiste: track.artist.name,
          cover: track.album?.coverUrl ?? track.coverUrl ?? null,
          genre: track.genre ?? null,
          duration_ms: Math.round(track.duration * 1000),
        }),
      });
    } catch {
      /* l'historique ne doit jamais bloquer la lecture */
    }
  }

  async clearHistory(): Promise<void> {
    await request('/api/history', { method: 'DELETE' });
  }

  async getFollows(): Promise<ProfileFollows> {
    if (!getToken()) return { following: [], followers: [], myArtist: null };
    return toProfileFollows(await request<ApiFollows>('/api/follows'));
  }

  async followArtist(artistId: string): Promise<void> {
    await request('/api/follows', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId }),
    });
  }

  async unfollowArtist(artistId: string): Promise<void> {
    await request(`/api/follows?artist_id=${encodeURIComponent(artistId)}`, {
      method: 'DELETE',
    });
  }

  async updateProfile(input: {
    name?: string;
    bio?: string | null;
    avatarUrl?: string | null;
  }): Promise<AuthUser> {
    const { user } = await request<{ user: AuthUser }>('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
      }),
    });
    return user;
  }

  async getMyArtist(): Promise<ArtistDashboard | null> {
    if (!getToken()) return null;
    try {
      const { artiste, morceaux, stats } = await request<{
        artiste: ApiArtist;
        morceaux: ApiTrack[];
        stats?: { total_duration_ms?: number };
      }>('/api/artists/me');

      const artist = toArtistProfile(artiste);
      // Les morceaux de /artists/me n'incluent pas le nom d'artiste : on le fournit
      const tracks = [...(morceaux ?? [])]
        .sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
        )
        .map((track) => toTrack({ ...track, artiste: artist.name }));

      return {
        artist,
        tracks,
        totalDurationMs:
          stats?.total_duration_ms ??
          tracks.reduce((total, track) => total + track.duration * 1000, 0),
      };
    } catch (error) {
      // Pas encore de profil : l'espace artiste propose de le créer
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async getArtist(id: string): Promise<ArtistProfile> {
    const { artiste } = await request<{ artiste: ApiArtist }>(
      `/api/artists/${encodeURIComponent(id)}`,
    );
    return toArtistProfile(artiste);
  }

  async getArtistStats(): Promise<ArtistStats | null> {
    if (!getToken()) return null;
    try {
      const { stats } = await request<{ stats: ArtistStats }>(
        '/api/artists/me/stats',
      );
      return stats;
    } catch (error) {
      // Pas encore de profil : la vue d'ensemble n'affiche rien de plus
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }
  }

  async createArtist(input: ArtistInput): Promise<ArtistProfile> {
    const { artist } = await request<{ artist: ApiArtist }>('/api/artists', {
      method: 'POST',
      body: JSON.stringify(toApiArtistFields(input)),
    });
    return toArtistProfile(artist);
  }

  async updateArtist(id: string, input: ArtistInput): Promise<ArtistProfile> {
    const { artist } = await request<{ artist: ApiArtist }>(
      `/api/artists/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(toApiArtistFields(input)),
      },
    );
    return toArtistProfile(artist);
  }

  async updateTrack(id: string, input: TrackInput): Promise<void> {
    await request(`/api/tracks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: input.title,
        album: input.album || null,
        genre: input.genre || null,
        bpm: input.bpm ?? null,
        key: input.key || null,
        year: input.year ?? null,
      }),
    });
  }

  async deleteTrack(id: string): Promise<void> {
    await request(`/api/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async getFavoriteIds(): Promise<Record<string, string>> {
    const { favorites } = await request<{ favorites: ApiFavorite[] }>('/api/favorites');
    return Object.fromEntries(
      favorites
        .filter((favorite) => favorite.track_id)
        .map((favorite) => [favorite.track_id as string, favorite.id]),
    );
  }

  async addFavorite(trackId: string): Promise<string> {
    const { favorite } = await request<{ favorite: { id: string } }>('/api/favorites', {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId }),
    });
    return favorite.id;
  }

  async removeFavorite(favoriteId: string): Promise<void> {
    await request(`/api/favorites?id=${encodeURIComponent(favoriteId)}`, {
      method: 'DELETE',
    });
  }

  async createPlaylist(nom: string): Promise<void> {
    await request('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ action: 'create', nom }),
    });
  }

  async renamePlaylist(id: string, nom: string): Promise<void> {
    await request(`/api/playlists/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ nom }),
    });
  }

  async deletePlaylist(id: string): Promise<void> {
    await request(`/api/playlists?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
    await request('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({ action: 'add_track', playlist_id: playlistId, track_id: trackId }),
    });
  }

  async removeTrackFromPlaylist(playlistTrackId: string): Promise<void> {
    await request(`/api/playlists?type=track&id=${encodeURIComponent(playlistTrackId)}`, {
      method: 'DELETE',
    });
  }

  async getMixPlan(trackIds: string[]): Promise<MixPlan> {
    const { mix } = await request<{
      mix: Array<{
        id: string;
        transition?: {
          style?: MixTransition['style'] | null;
          duration?: number;
          beatSync?: boolean;
          reason?: string | null;
        } | null;
      }>;
    }>('/api/mix', {
      method: 'POST',
      body: JSON.stringify({ trackIds, mixType: 'ai' }),
    });

    const transitions: Record<string, MixTransition> = {};
    mix.forEach((item, index) => {
      const next = mix[index + 1];
      const transition = item.transition;
      if (!next || !transition?.style || typeof transition.duration !== 'number') return;
      transitions[`${item.id}->${next.id}`] = {
        style: transition.style,
        duration: transition.duration,
        tempoSync: transition.beatSync !== false,
        reason: transition.reason ?? null,
      };
    });

    return { order: mix.map((item) => item.id), transitions };
  }

  async uploadImage(file: File, folder = 'images'): Promise<string> {
    const contentType = file.type || 'application/octet-stream';
    const { uploadUrl, publicUrl, headers } = await request<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      headers?: Record<string, string>;
    }>('/api/upload/image', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType, folder }),
    });

    await putFile(uploadUrl, file, headers ?? { 'Content-Type': contentType });
    return publicUrl;
  }

  async uploadTrack(
    file: File,
    input: PublishInput,
    onStage?: (stage: PublishStage) => void,
    onProgress?: (percent: number) => void,
  ): Promise<Track> {
    const contentType = file.type || 'audio/mpeg';
    const { uploadUrl, publicUrl, key, headers } = await request<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      headers?: Record<string, string>;
    }>('/api/tracks/upload-url', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType }),
    });

    // PUT direct vers R2 : pas de token Mixify dans cet appel (URL présignée).
    onStage?.('upload');
    await putFile(uploadUrl, file, headers ?? { 'Content-Type': contentType }, onProgress);

    // Le serveur contrôle le fichier stocké avant de le rendre public.
    onStage?.('check');
    const { track } = await request<{ track: ApiTrack }>('/api/tracks', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        album: input.album,
        bpm: input.bpm,
        year: input.year,
        cover_url: input.coverUrl,
        duration_ms: input.duration ? Math.round(input.duration * 1000) : undefined,
        audio_url: publicUrl,
        audio_key: key,
      }),
    });
    return toTrack(track);
  }
}

export const api: MusicApi = new MixifyApi();

// --------------------------------------------------------------------- auth

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function loginRequest(email: string, password: string, role?: Role): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export function registerRequest(input: {
  email: string;
  password: string;
  name: string;
  role: string;
  birthDate?: string;
  artist?: {
    genres?: string;
    bio?: string;
    country?: string;
    websiteUrl?: string;
  };
}): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      birth_date: input.birthDate,
      artist: input.artist
        ? {
            genres: input.artist.genres,
            bio: input.artist.bio,
            country: input.artist.country,
            website_url: input.artist.websiteUrl,
          }
        : undefined,
    }),
  });
}

export function meRequest(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>('/api/auth/me');
}
