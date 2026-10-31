import { File, UploadType } from 'expo-file-system';

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
  Playlist,
  ProfileFollows,
  SearchResults,
  Shelf,
  Track,
  TrackInput,
} from '@/types/music';
import type { AuthUser, Role } from '@/types/auth';

/**
 * Client du backend Mixify (mêmes routes que l'app web).
 * Le jeton est injecté par `setApiToken`, alimenté par le contexte d'auth.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://mixifybackend.vercel.app'
).replace(/\/$/, '');

let token: string | null = null;

export function setApiToken(value: string | null): void {
  token = value;
}

export function getToken(): string | null {
  return token;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifie ta connexion.');
  }

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    const fallback =
      response.status >= 500
        ? 'Service momentanément indisponible. Réessaie dans un instant.'
        : `Erreur ${response.status}`;
    throw new ApiError(payload?.error ?? fallback, response.status);
  }
  return payload as T;
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
  artiste_info?: ApiArtist | null;
  album: string | null;
  cover_url: string | null;
  duration_ms: number | null;
  audio_url: string | null;
  bpm: number | null;
  key: string | null;
  year: number | null;
  genre?: string | null;
  plays?: number | null;
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

function toGenres(raw: string | null | undefined): string[] | undefined {
  return raw
    ? raw
        .split(',')
        .map((genre) => genre.trim())
        .filter(Boolean)
    : undefined;
}

function toArtist(raw: ApiArtist): Artist {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image_url ?? undefined,
    genres: toGenres(raw.genres),
    followers: raw.followers_count ?? undefined,
    country: raw.country ?? undefined,
    verified: raw.verified === true,
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
    genres: toGenres(raw.artiste_info?.genres),
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

function toLikedTrack(raw: ApiFavorite): Track {
  if (raw.track) return toTrack(raw.track);
  return {
    id: `favori-${raw.id}`,
    title: raw.titre,
    artist: { id: '', name: raw.artiste ?? 'Artiste inconnu' },
    duration: 0,
  };
}

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

/** Playlists du compte connecté (vide sans session). */
async function myPlaylists(): Promise<Playlist[]> {
  if (!token) return [];
  const { playlists } = await request<{ playlists: ApiPlaylist[] }>('/api/playlists');
  return playlists.map(toPlaylist);
}

// ------------------------------------------------------------------- accueil

export async function getHome(): Promise<HomeFeed> {
  const [{ tracks }, { artists }, playlists] = await Promise.all([
    request<{ tracks: ApiTrack[] }>('/api/tracks?stats=1'),
    request<{ artists: ApiArtist[] }>('/api/artists'),
    myPlaylists().catch(() => [] as Playlist[]),
  ]);

  const mappedTracks = tracks.map(toTrack);
  const mappedArtists = artists.map(toArtist);
  const withTempo = mappedTracks.filter((track) => track.bpm);
  const byPlays = (a: Track, b: Track) => (b.plays ?? 0) - (a.plays ?? 0);
  const hour = new Date().getHours();

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

// --------------------------------------------------------------- catalogue

export async function search(query: string): Promise<SearchResults> {
  const q = query.trim();
  const [{ tracks }, { artists }, playlists] = await Promise.all([
    request<{ tracks: ApiTrack[] }>(`/api/tracks?search=${encodeURIComponent(q)}`),
    request<{ artists: ApiArtist[] }>(`/api/artists?search=${encodeURIComponent(q)}`),
    myPlaylists().catch(() => [] as Playlist[]),
  ]);
  const needle = q.toLowerCase();

  return {
    tracks: tracks.map(toTrack),
    albums: [],
    artists: artists.map(toArtist),
    playlists: playlists.filter((playlist) => playlist.title.toLowerCase().includes(needle)),
  };
}

export async function getTracks(): Promise<Track[]> {
  const { tracks } = await request<{ tracks: ApiTrack[] }>('/api/tracks');
  return tracks.map(toTrack);
}

export async function getChart(period: 'week' | 'month' | 'year'): Promise<Track[]> {
  const { tracks } = await request<{ tracks: ApiTrack[] }>(
    `/api/tracks?stats=1&period=${period}`,
  );
  return tracks
    .map(toTrack)
    .filter((track) => (track.plays ?? 0) > 0)
    .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));
}

export async function getPlaylist(id: string): Promise<Playlist> {
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

export async function getLibrary(): Promise<Library> {
  if (!token) throw new Error('Connectez-vous pour accéder à votre bibliothèque');
  const [{ favorites }, playlists] = await Promise.all([
    request<{ favorites: ApiFavorite[] }>('/api/favorites'),
    myPlaylists(),
  ]);

  return {
    playlists,
    liked: (favorites ?? []).map(toLikedTrack),
  };
}

/** URL de streaming : fournie par la liste, sinon demandée au détail du titre. */
export async function getStreamUrl(track: Track): Promise<string> {
  if (track.streamUrl) return track.streamUrl;
  const { track: raw } = await request<{ track: ApiTrack }>(
    `/api/tracks/${encodeURIComponent(track.id)}`,
  );
  if (!raw?.audio_url) throw new Error(`Aucun fichier audio pour « ${track.title} »`);
  return raw.audio_url;
}

// ------------------------------------------------------------------- compte

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  token?: string;
  user?: AuthUser;
  verificationRequired?: boolean;
  email?: string;
}

export function loginRequest(
  email: string,
  password: string,
  role?: Role,
): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: Role;
  birthDate?: string;
  referralCode?: string;
  artist?: {
    genres?: string;
    bio?: string;
    country?: string;
    websiteUrl?: string;
  };
}

export function registerRequest(input: RegisterInput): Promise<RegisterResponse> {
  return request<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      birth_date: input.birthDate,
      referral_code: input.referralCode,
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

export function requestEmailVerification(email: string): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/verify-email/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function meRequest(): Promise<AuthUser> {
  return request<{ user: AuthUser }>('/api/auth/me').then((payload) => payload.user);
}

export async function deleteOwnAccount(): Promise<void> {
  await request('/api/auth/me', { method: 'DELETE' });
}

export async function updateProfile(input: {
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

export async function getHistory(): Promise<HistoryEntry[]> {
  if (!token) return [];
  const { history } = await request<{ history: ApiHistoryEntry[] }>('/api/history');
  return (history ?? []).map(toHistoryEntry);
}

export async function recordHistory(track: Track): Promise<void> {
  if (!token) return;
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

export async function clearHistory(): Promise<void> {
  await request('/api/history', { method: 'DELETE' });
}

export async function getFollows(): Promise<ProfileFollows> {
  if (!token) return { following: [], followers: [], myArtist: null };
  return toProfileFollows(await request<ApiFollows>('/api/follows'));
}

export async function followArtist(artistId: string): Promise<void> {
  await request('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ artist_id: artistId }),
  });
}

export async function unfollowArtist(artistId: string): Promise<void> {
  await request(`/api/follows?artist_id=${encodeURIComponent(artistId)}`, {
    method: 'DELETE',
  });
}

// ------------------------------------------------------------------ favoris

export async function getFavoriteIds(): Promise<Record<string, string>> {
  const { favorites } = await request<{ favorites: ApiFavorite[] }>('/api/favorites');
  return Object.fromEntries(
    favorites
      .filter((favorite) => favorite.track_id)
      .map((favorite) => [favorite.track_id as string, favorite.id]),
  );
}

export async function addFavorite(trackId: string): Promise<string> {
  const { favorite } = await request<{ favorite: { id: string } }>('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ track_id: trackId }),
  });
  return favorite.id;
}

export async function removeFavorite(favoriteId: string): Promise<void> {
  await request(`/api/favorites?id=${encodeURIComponent(favoriteId)}`, { method: 'DELETE' });
}

// --------------------------------------------------------------- playlists

export async function createPlaylist(nom: string): Promise<void> {
  await request('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ action: 'create', nom }),
  });
}

export async function renamePlaylist(id: string, nom: string): Promise<void> {
  await request(`/api/playlists/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ nom }),
  });
}

export async function deletePlaylist(id: string): Promise<void> {
  await request(`/api/playlists?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  await request('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_track', playlist_id: playlistId, track_id: trackId }),
  });
}

export async function removeTrackFromPlaylist(playlistTrackId: string): Promise<void> {
  await request(`/api/playlists?type=track&id=${encodeURIComponent(playlistTrackId)}`, {
    method: 'DELETE',
  });
}

// ------------------------------------------------------------ espace artiste

export async function getMyArtist(): Promise<ArtistDashboard | null> {
  if (!token) return null;
  try {
    const { artiste, morceaux, stats, referral } = await request<{
      artiste: ApiArtist;
      morceaux: ApiTrack[];
      stats?: { total_duration_ms?: number };
      referral?: ArtistDashboard['referral'];
    }>('/api/artists/me');

    const artist = toArtistProfile(artiste);
    const tracks = [...(morceaux ?? [])]
      .sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      )
      .map((track) => toTrack({ ...track, artiste: artist.name }));

    return {
      artist,
      tracks,
      totalDurationMs:
        stats?.total_duration_ms ??
        tracks.reduce((total, track) => total + track.duration * 1000, 0),
      referral,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getArtist(id: string): Promise<ArtistProfile> {
  const { artiste } = await request<{ artiste: ApiArtist }>(
    `/api/artists/${encodeURIComponent(id)}`,
  );
  return toArtistProfile(artiste);
}

export async function getArtistStats(): Promise<ArtistStats | null> {
  if (!token) return null;
  try {
    const { stats } = await request<{ stats: ArtistStats }>('/api/artists/me/stats');
    return stats;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function createArtist(input: ArtistInput): Promise<ArtistProfile> {
  const { artist } = await request<{ artist: ApiArtist }>('/api/artists', {
    method: 'POST',
    body: JSON.stringify(toApiArtistFields(input)),
  });
  return toArtistProfile(artist);
}

export async function updateArtist(id: string, input: ArtistInput): Promise<ArtistProfile> {
  const { artist } = await request<{ artist: ApiArtist }>(
    `/api/artists/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(toApiArtistFields(input)) },
  );
  return toArtistProfile(artist);
}

export async function updateTrack(id: string, input: TrackInput): Promise<void> {
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

export async function deleteTrack(id: string): Promise<void> {
  await request(`/api/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Étapes visibles du pipeline de publication. */
export type PublishStage = 'upload' | 'check';

/** Champs saisis lors de la publication d'un morceau. */
export interface PublishInput {
  title: string;
  album?: string;
  genre?: string;
  bpm?: number;
  year?: number;
  /** Durée en millisecondes, lue avant l'envoi. */
  durationMs?: number;
  /** Pochette déjà hébergée (URL publique). */
  coverUrl?: string;
}

export interface AudioFileInput {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

/** Téléverse le fichier vers R2 puis publie le morceau au catalogue. */
export async function uploadTrack(
  file: AudioFileInput,
  input: PublishInput,
  onStage?: (stage: PublishStage) => void,
  onProgress?: (percent: number) => void,
): Promise<Track> {
  const contentType = file.mimeType || 'audio/mpeg';
  const { uploadUrl, publicUrl, key, headers } = await request<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    headers?: Record<string, string>;
  }>('/api/tracks/upload-url', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name, contentType, size: file.size }),
  });

  // PUT direct vers R2 : l'URL présignée ne porte pas le jeton Mixify.
  onStage?.('upload');
  const task = new File(file.uri).createUploadTask(uploadUrl, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    headers: headers ?? { 'Content-Type': contentType },
    mimeType: contentType,
    onProgress: ({ bytesSent, totalBytes }) => {
      if (totalBytes > 0) onProgress?.(Math.round((bytesSent / totalBytes) * 100));
    },
  });
  const result = await task.uploadAsync();
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Téléversement refusé par R2 (${result.status})`);
  }
  onProgress?.(100);

  // Le serveur contrôle le fichier stocké avant de le rendre public.
  onStage?.('check');
  const { track } = await request<{ track: ApiTrack }>('/api/tracks', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      album: input.album,
      genre: input.genre,
      bpm: input.bpm,
      year: input.year,
      cover_url: input.coverUrl,
      duration_ms: input.durationMs,
      audio_url: publicUrl,
      audio_key: key,
    }),
  });
  return toTrack(track);
}
