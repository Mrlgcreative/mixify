/** Rôles acceptés par le backend (`/api/auth/register`). */
export type Role = 'utilisateur' | 'artiste' | 'developper' | 'admin';

/** Choix d'onboarding : espace auditeur ou espace artiste. */
export type AccountRole = 'artiste' | 'utilisateur';

export interface AuthUser {
  id: string;
  email: string;
  email_verified?: boolean;
  name: string | null;
  role: Role;
  birth_date?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at?: string | null;
}

/** Champs de profil collectés à l'inscription artiste (facultatifs). */
export interface ArtistSignupDetails {
  genres?: string;
  bio?: string;
  country?: string;
  websiteUrl?: string;
}
