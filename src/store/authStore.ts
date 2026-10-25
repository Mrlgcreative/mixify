import { create } from 'zustand';

import { ApiError, getToken, loginRequest, meRequest, registerRequest, setToken, takeAuthCallback } from '../api/musicApi';
import type { ArtistSignupDetails, AuthUser, Role } from '../types/auth';

interface AuthStore {
  user: AuthUser | null;
  /** Session relue (ou absence de session confirmée). */
  ready: boolean;
  busy: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string, role?: Role) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    birthDate?: string;
    artist?: ArtistSignupDetails;
    verification?: Record<string, unknown>;
  }) => Promise<void>;
  logout: () => void;
  /** Remplace l'utilisateur courant après une mise à jour du profil. */
  setUser: (user: AuthUser) => void;
  clearError: () => void;
}

/** Une seule reprise de session, même si l'effet est rejoué (StrictMode). */
let initPromise: Promise<void> | null = null;

const USER_KEY = 'mixify.user';

/** Dernier profil connu : permet de rouvrir l'app hors ligne sans repasser par la connexion. */
function readCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* stockage indisponible : l'app redemandera la connexion hors ligne */
  }
}

/** Session du front : token Bearer conservé en localStorage, utilisateur relu via /api/auth/me. */
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  ready: false,
  busy: false,
  error: null,

  // StrictMode monte les effets deux fois : un seul /api/auth/me doit partir,
  // sinon un échec Forge peut effacer le jeton pendant que l'autre appel réussit.
  init() {
    initPromise ??= (async () => {
      // Retour de Google : le jeton (ou l'erreur) arrive dans le fragment d'URL
      const callback = takeAuthCallback();
      if (callback.token) setToken(callback.token);
      if (callback.error) set({ error: callback.error });

      if (!getToken()) {
        set({ ready: true });
        return;
      }
      try {
        const { user } = await meRequest();
        set({ user });
        writeCachedUser(user);
      } catch (error) {
        // Jeton expiré ou révoqué uniquement : une panne réseau garde la session.
        if (error instanceof ApiError && error.status === 401) {
          setToken(null);
          writeCachedUser(null);
          set({ user: null });
        } else {
          // Hors ligne : on rouvre avec le dernier profil connu.
          set({ user: readCachedUser() });
        }
      } finally {
        set({ ready: true });
      }
    })();
    return initPromise;
  },

  async login(email, password, role) {
    set({ busy: true, error: null });
    try {
      const { token, user } = await loginRequest(email, password, role);
      setToken(token);
      writeCachedUser(user);
      set({ user });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Connexion impossible' });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  async register(input) {
    set({ busy: true, error: null });
    try {
      const { token, user } = await registerRequest(input);
      setToken(token);
      writeCachedUser(user);
      set({ user });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Inscription impossible' });
      throw error;
    } finally {
      set({ busy: false });
    }
  },

  logout() {
    setToken(null);
    writeCachedUser(null);
    set({ user: null, error: null });
  },

  setUser(user) {
    writeCachedUser(user);
    set({ user });
  },

  clearError() {
    set({ error: null });
  },
}));
