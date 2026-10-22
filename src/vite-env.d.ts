/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du backend Next.js (ex. http://localhost:3001 en dev). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
