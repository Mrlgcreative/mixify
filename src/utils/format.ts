/** Formatage temporel partagé (mm:ss). */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Taille lisible : « 850 Ko », « 4,2 Mo ». */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Ko';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/**
 * Estimation avant téléchargement (128 kbit/s, débit le plus courant).
 * shortcut: l'API ne publie pas la taille réelle des fichiers ; la remplacer
 * par un HEAD (Content-Length) quand elle l'exposera.
 */
export function estimateAudioBytes(durationSeconds: number, kbps = 128): number {
  return Math.max(0, durationSeconds) * ((kbps * 1000) / 8);
}
