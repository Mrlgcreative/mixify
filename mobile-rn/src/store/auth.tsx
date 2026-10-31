import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  ApiError,
  deleteOwnAccount,
  loginRequest,
  meRequest,
  registerRequest,
  setApiToken,
  updateProfile,
  type RegisterInput,
} from '@/api/musicApi';
import type { AuthUser, Role } from '@/types/auth';
import { clearQueryCache } from '@/lib/query';
import { clearAudioCache } from '@/lib/audioCache';
import { resetMetrics } from '@/lib/metrics';

const TOKEN_KEY = 'mixify.token';
const USER_KEY = 'mixify.user';

interface AuthContextValue {
  user: AuthUser | null;
  /** Lecture du jeton terminée (évite un flash « déconnecté »). */
  ready: boolean;
  busy: boolean;
  error: string | null;
  login: (email: string, password: string, role?: Role) => Promise<void>;
  register: (input: Omit<RegisterInput, 'role'> & { role: Role }) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Remplace l'utilisateur courant après une mise à jour du profil. */
  updateUser: (input: { name?: string; bio?: string; avatarUrl?: string }) => Promise<AuthUser>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function storeToken(value: string | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* coffre indisponible : la session reste en mémoire */
  }
}

async function storeUser(value: AuthUser | null): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(USER_KEY, JSON.stringify(value));
    else await SecureStore.deleteItemAsync(USER_KEY);
  } catch {
    /* coffre indisponible : la session reste en mémoire */
  }
}

async function readUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Toute connexion/déconnexion annule la restauration encore en cours.
  const session = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const generation = session.current;

    (async () => {
      const [stored, cached] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY).catch(() => null),
        readUser(),
      ]);
      if (cancelled) return;
      if (!stored) {
        setReady(true);
        return;
      }

      setApiToken(stored);

      // Session affichée immédiatement depuis le cache, rafraîchie en arrière-plan.
      if (cached) {
        setUser(cached);
        setReady(true);
      }

      try {
        const current = await meRequest();
        if (cancelled || session.current !== generation) return;
        setUser(current);
        void storeUser(current);
      } catch (cause) {
        if (cancelled || session.current !== generation) return;
        // Jeton refusé : on efface. Erreur réseau : on garde la session en cache.
        if (cause instanceof ApiError && cause.status === 401) {
          setApiToken(null);
          await Promise.all([storeToken(null), storeUser(null)]);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, role?: Role) => {
    setBusy(true);
    setError(null);
    try {
      const response = await loginRequest(email.trim(), password, role);
      session.current += 1;
      setApiToken(response.token);
      // L'écran passe tout de suite ; l'écriture du coffre ne bloque pas.
      setUser(response.user);
      void Promise.all([storeToken(response.token), storeUser(response.user)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible');
      throw cause;
    } finally {
      setBusy(false);
    }
  }, []);

  const register = useCallback(
    async (input: Omit<RegisterInput, 'role'> & { role: Role }) => {
      setBusy(true);
      setError(null);
      try {
        const response = await registerRequest(input);
        if (response.verificationRequired) return true;
        if (!response.token || !response.user) {
          throw new Error("Réponse d'inscription invalide");
        }
        session.current += 1;
        setApiToken(response.token);
        setUser(response.user);
        void Promise.all([storeToken(response.token), storeUser(response.user)]);
        return false;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Inscription impossible');
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    session.current += 1;
    setApiToken(null);
    setUser(null);
    setError(null);
    void clearQueryCache();
    await Promise.all([storeToken(null), storeUser(null)]);
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteOwnAccount();
    await logout();
    clearAudioCache();
    resetMetrics();
  }, [logout]);

  const updateUser = useCallback(
    async (input: { name?: string; bio?: string; avatarUrl?: string }) => {
      const updated = await updateProfile(input);
      session.current += 1;
      setUser(updated);
      void storeUser(updated);
      return updated;
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ user, ready, busy, error, login, register, logout, deleteAccount, updateUser, clearError }),
    [user, ready, busy, error, login, register, logout, deleteAccount, updateUser, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}

/** Rôles autorisés à publier / voir le parrainage. */
export function canPublish(role: Role | undefined): boolean {
  return role === 'artiste' || role === 'developper' || role === 'admin';
}
