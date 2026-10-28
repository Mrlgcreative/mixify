/**
 * PKCE S256 et analyse du deep link Google de l'app Android.
 * Le schéma doit correspondre à `MOBILE_REDIRECT_URI` côté backend et au manifest.
 */

const MOBILE_SCHEME = 'com.imasomo.mixify';

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export interface MobileAuthParams {
  code?: string;
  nonce?: string;
  error?: string;
}

/** null si l'URL n'est pas le retour OAuth de l'app. */
export function parseMobileAuthUrl(raw: string): MobileAuthParams | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${MOBILE_SCHEME}:` || url.hostname !== 'auth') return null;

  const params: MobileAuthParams = {};
  const code = url.searchParams.get('code');
  const nonce = url.searchParams.get('nonce');
  const error = url.searchParams.get('error');
  if (code) params.code = code;
  if (nonce) params.nonce = nonce;
  if (error) params.error = error;
  return params;
}
