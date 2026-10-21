/**
 * Authentification Spotify — flux Authorization Code + PKCE
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 *
 * Choisi parce qu'il n'y a AUCUN serveur : pas de `client_secret`, la
 * protection vient du `code_verifier` (jeton éphémère stocké dans
 * sessionStorage et rejoué à l'échange). Le `client_id` est une information
 * publique : il peut vivre dans le bundle.
 *
 * Retour OAuth (`?code=...`) : Spotify redirige vers l'URI déclarée dans le
 * dashboard — en dev, `http://localhost:5173/` exactement. `main.tsx` appelle
 * `handleSpotifyCallback()` avant le premier rendu : le code est échangé contre
 * les jetons, puis nettoyé de l'URL (`history.replaceState`) pour ne jamais
 * être re-traité.
 *
 * shortcut: le jeton d'accès vit dans localStorage (1 h, auto-refresh via le
 * refresh_token). Une révocation côté Spotify ne se voit qu'à la première
 * requête 401, qui remonte son erreur dans l'UI — recharger puis revérifier
 * la connexion.
 */

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const STORAGE_KEY = 'mixify.spotify.token';
const VERIFIER_KEY = 'mixify.spotify.verifier';
const STATE_KEY = 'mixify.spotify.state';

/** Périmètre minimal : bibliothèque, playlists et écoutes récentes. */
const SCOPES = 'user-library-read playlist-read-private user-read-recently-played';

/**
 * Relit `import.meta.env` de façon defensice : `node --test` n'expose pas
 * `import.meta.env`, seule l'exécution navigateur peut l'avoir.
 */
function envValue(name: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.[name]?.trim();
}

function clientId(): string {
  return envValue('VITE_SPOTIFY_CLIENT_ID') ?? '';
}

export function isSpotifyConfigured(): boolean {
  return clientId().length > 0;
}

/** URI de redirection OAuth. */
function redirectUri(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_SPOTIFY_REDIRECT_URI?.trim();
  if (configured) return configured;
  // Spotify exige une correspondance EXACTE (schéma, host, port, slash final).
  return `${location.origin}/`;
}

// ------------------------------------------------------------- stockage jeton

interface StoredToken {
  access: string;
  refresh?: string;
  /** Date d'expiration du jeton d'accès (timestamp ms). */
  expiresAt: number;
}

function readToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

function writeToken(token: StoredToken | null): void {
  if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  else localStorage.removeItem(STORAGE_KEY);
}

export function isSpotifyLoggedIn(): boolean {
  return readToken() !== null;
}

export function spotifyLogout(): void {
  writeToken(null);
}

// --------------------------------------------------------------------- PKCE

const bytesToBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function randomCodeVerifier(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(64)));
}

/** Défi S256 (SHA-256) du verifier : envoyé à Spotify, vérifié à l'échange. */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

// --------------------------------------------------------------------- flux

/** Redirige vers l'écran de consentement Spotify (aller simple, sans état local). */
export async function spotifyLogin(): Promise<void> {
  if (!isSpotifyConfigured()) {
    throw new Error(
      'VITE_SPOTIFY_CLIENT_ID manquant : créez une app sur developer.spotify.com/dashboard',
    );
  }
  const verifier = randomCodeVerifier();
  const state = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  // Le verifier et le state doivent survivre au aller-retour chez Spotify.
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const url = `${AUTHORIZE_URL}?${new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await codeChallenge(verifier),
    state,
    scope: SCOPES,
  })}`;
  location.assign(url);
}

async function requestToken(body: Record<string, string>): Promise<StoredToken | null> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), ...body }),
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  const token: StoredToken = {
    access: payload.access_token,
    refresh: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  writeToken(token);
  return token;
}

/**
 * À appeler au démarrage (main.tsx) : échange le `?code=` éventuel contre des
 * jetons et nettoie l'URL. Renvoie `true` si un échange a eu lieu.
 */
export async function handleSpotifyCallback(): Promise<boolean> {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const error = params.get('error');
  if (!code && !error) return false;

  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  // Nettoyage quoi qu'il arrive : le code d'autorisation n'est valable qu'une fois.
  history.replaceState(null, '', location.pathname);

  const state = params.get('state');
  if (error || !code || !verifier || !state || state !== expectedState) {
    console.error('Retour Spotify invalide :', error ?? 'state/verifier/code absents');
    return false;
  }

  const token = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  if (!token) {
    console.error('Spotify : échange du code refusé (redirect_uri déclarée au dashboard ?)');
    return false;
  }
  return true;
}

/** Jeton d'accès valide, rafraîchi 60 s avant expiration ; `null` si déconnecté. */
export async function spotifyToken(): Promise<string | null> {
  const token = readToken();
  if (!token) return null;
  if (token.expiresAt - Date.now() > 60_000) return token.access;
  if (!token.refresh) {
    writeToken(null);
    return null;
  }
  const refreshed = await requestToken({
    grant_type: 'refresh_token',
    refresh_token: token.refresh,
  });
  return refreshed?.access ?? null;
}
