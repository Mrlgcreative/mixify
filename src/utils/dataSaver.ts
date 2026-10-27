/**
 * Préférences « économie de données ».
 *
 * La qualité choisie est conservée côté client : c'est le levier que le backend
 * peut lire (en-tête / query) quand il exposera des variantes encodées. Aucun
 * transcodage n'est fait dans le navigateur.
 */

export type AudioQuality = 'eco' | 'standard' | 'haute';

export const audioQualities: Array<{ value: AudioQuality; label: string; detail: string }> = [
  { value: 'eco', label: 'Économie', detail: 'Moins de données, idéal en 3G' },
  { value: 'standard', label: 'Standard', detail: 'Bon équilibre qualité / données' },
  { value: 'haute', label: 'Haute', detail: 'Meilleure qualité disponible' },
];

const QUALITY_KEY = 'mixify.audioQuality';
const WIFI_KEY = 'mixify.downloadWifiOnly';

export function getAudioQuality(): AudioQuality {
  try {
    const value = localStorage.getItem(QUALITY_KEY);
    return value === 'eco' || value === 'haute' ? value : 'standard';
  } catch {
    return 'standard';
  }
}

export function setAudioQuality(quality: AudioQuality): void {
  try {
    localStorage.setItem(QUALITY_KEY, quality);
  } catch {
    /* stockage indisponible : la préférence ne survivra pas au rechargement */
  }
}

/**
 * Téléchargements réservés au Wi-Fi. Désactivé par défaut : on télécharge
 * aussi en données mobiles, l'utilisateur peut l'activer pour économiser.
 */
export function getWifiOnlyDownloads(): boolean {
  try {
    return localStorage.getItem(WIFI_KEY) === '1';
  } catch {
    return false;
  }
}

export function setWifiOnlyDownloads(enabled: boolean): void {
  try {
    localStorage.setItem(WIFI_KEY, enabled ? '1' : '0');
  } catch {
    /* idem */
  }
}

function connectionType(): string | undefined {
  const connection = (
    navigator as Navigator & { connection?: { type?: string; effectiveType?: string } }
  ).connection;
  return connection?.type;
}

/**
 * Vrai si le téléchargement est autorisé maintenant. Connexion inconnue
 * (ordinateur, navigateur sans Network Information API) : on autorise.
 */
export function canDownloadNow(): boolean {
  if (!getWifiOnlyDownloads()) return true;
  const type = connectionType();
  if (!type) return true;
  // shortcut: Chrome n'expose pas `type` (seulement effectiveType pour la
  // vitesse), donc la règle Wi-Fi ne bloque que les navigateurs qui le publient.
  return type === 'wifi' || type === 'ethernet';
}
