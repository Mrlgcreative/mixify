import { request } from './musicApi';
import type { Role } from '../types/auth';

/**
 * Client des routes `/api/admin/*` (réservées au rôle `admin`).
 * Les réponses sont gardées en snake_case : l'interface admin affiche
 * des données brutes de modération, sans modèle métier intermédiaire.
 */

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  status?: 'active' | 'suspended' | 'banned' | null;
  avatar_url?: string | null;
  created_at?: string | null;
}

export interface AdminArtist {
  id: string;
  name: string;
  user_id?: string | null;
  verified?: boolean | null;
  genres?: string | null;
  country?: string | null;
  image_url?: string | null;
  created_at?: string | null;
}

export interface AdminTrack {
  id: string;
  title: string;
  artist_id?: string | null;
  status?: string | null;
  audio_url?: string | null;
  duration_ms?: number | null;
  created_at?: string | null;
}

export interface VerificationRequest {
  id: string;
  artist_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  message?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  soundcloud_url?: string | null;
  website_url?: string | null;
  created_at?: string | null;
}

export interface AdminLog {
  id: string;
  admin_user_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: string | null;
  created_at?: string | null;
}

export interface AdminOverview {
  users: {
    total: number;
    byRole: Record<Role, number>;
    byStatus: Record<'active' | 'suspended' | 'banned', number>;
    signupsByDay: Record<string, number>;
  };
  artists: { total: number; verified: number; pending: number };
  tracks: { total: number; withAudio: number; withBpm: number };
  content: { favorites: number; playlists: number };
  applications: { total: number; active: number; suspended: number; revoked: number };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

const PAGE_SIZE = 30;

function page<T>(items: T[], pagination: any, requested: number): Page<T> {
  return {
    items,
    total: Number(pagination?.total ?? items.length),
    page: requested,
    hasMore: pagination?.hasMore === true,
  };
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const suffix = search.toString();
  return suffix ? `?${suffix}` : '';
}

export const adminApi = {
  overview(): Promise<AdminOverview> {
    return request<{ overview: AdminOverview }>('/api/admin/overview').then((r) => r.overview);
  },

  async users(params: { search?: string; role?: string; status?: string; page?: number }) {
    const current = params.page ?? 1;
    const result = await request<{ users: AdminUser[]; pagination: any }>(
      `/api/admin/users${query({ ...params, page: current, limit: PAGE_SIZE })}`,
    );
    return page(result.users, result.pagination, current);
  },

  updateUser(input: { userId: string; role?: Role; status?: string }): Promise<AdminUser> {
    return request<{ user: AdminUser }>('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }).then((r) => r.user);
  },

  deleteUser(userId: string): Promise<void> {
    return request<void>(`/api/admin/users${query({ userId })}`, { method: 'DELETE' });
  },

  async artists(params: { search?: string; verified?: string; page?: number; limit?: number }) {
    const current = params.page ?? 1;
    const result = await request<{ artists: AdminArtist[]; pagination: any }>(
      `/api/admin/artists${query({ ...params, page: current, limit: params.limit ?? PAGE_SIZE })}`,
    );
    return page(result.artists, result.pagination, current);
  },

  setArtistVerified(artistId: string, verified: boolean): Promise<void> {
    return request<void>('/api/admin/artists', {
      method: 'PATCH',
      body: JSON.stringify({ artistId, verified }),
    });
  },

  deleteArtist(artistId: string): Promise<void> {
    return request<void>(`/api/admin/artists${query({ artistId })}`, { method: 'DELETE' });
  },

  async tracks(params: { search?: string; page?: number }) {
    const current = params.page ?? 1;
    const result = await request<{ tracks: AdminTrack[]; pagination: any }>(
      `/api/admin/tracks${query({ ...params, page: current, limit: PAGE_SIZE })}`,
    );
    return page(result.tracks, result.pagination, current);
  },

  deleteTrack(trackId: string): Promise<void> {
    return request<void>(`/api/admin/tracks${query({ trackId })}`, { method: 'DELETE' });
  },

  verificationRequests(status?: string): Promise<VerificationRequest[]> {
    return request<{ requests: VerificationRequest[] }>(
      `/api/admin/verification-requests${query({ status })}`,
    ).then((r) => r.requests);
  },

  reviewVerification(requestId: string, status: 'approved' | 'rejected', adminNote?: string) {
    return request<void>('/api/admin/verification-requests', {
      method: 'PATCH',
      body: JSON.stringify({ requestId, status, adminNote }),
    });
  },

  async logs(params: { page?: number; action?: string }) {
    const current = params.page ?? 1;
    const result = await request<{ logs: AdminLog[]; pagination: any }>(
      `/api/admin/logs${query({ ...params, page: current, limit: PAGE_SIZE })}`,
    );
    return page(result.logs, result.pagination, current);
  },
};
