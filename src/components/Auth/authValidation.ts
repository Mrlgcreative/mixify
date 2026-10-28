/** Validations communes aux formulaires d'authentification. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_AGE = 13;

/** Code de parrainage présent dans l'URL (`?ref=slug-artiste`). */
export function referralCodeFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const code = new URLSearchParams(window.location.search).get('ref')?.trim();
  return code || undefined;
}

/** Âge révolu à une date AAAA-MM-JJ, ou null si la date est invalide. */
export function ageAt(value: string): number | null {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) age--;
  return age;
}

/** Date maximale acceptée : 13 ans aujourd'hui (bornée par le navigateur). */
export function maxBirthDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - MIN_AGE);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
