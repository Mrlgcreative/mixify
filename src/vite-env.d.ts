/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Source de catalogue : `itunes` (défaut, sans clé, artistes reconnus en
   * extraits de 30 s) | `jamendo` (exige VITE_JAMENDO_CLIENT_ID) |
   * `spotify` (exige VITE_SPOTIFY_CLIENT_ID, connexion OAuth du compte) |
   * `demo`. VITE_API_BASE_URL, s'il est défini, prime toujours.
   */
  readonly VITE_MUSIC_API?: string;
  /** Client ID Jamendo (gratuit sur https://devportal.jamendo.com). */
  readonly VITE_JAMENDO_CLIENT_ID?: string;
  /** Client ID de l'application Spotify (flux PKCE : pas de secret côté front). */
  readonly VITE_SPOTIFY_CLIENT_ID?: string;
  /** URL du backend REST (ex. https://api.mixify.dev). Absent = selon VITE_MUSIC_API. */
  readonly VITE_API_BASE_URL?: string;
  /** URL WebSocket pour les événements serveur (now-playing, lyrics…). */
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
