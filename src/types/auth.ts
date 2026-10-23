/** Rôles acceptés par le backend (`/api/auth/register`). */
export type Role = 'utilisateur' | 'artiste' | 'developper' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  /** Date de naissance (comptes artistes uniquement), au format AAAA-MM-JJ. */
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
