/**
 * Analyse de la fin d'un morceau — sans dépendance DOM.
 *
 * Apple Music ne mixe pas systématiquement : un morceau qui se termine sur un
 * accord tenu ou par un long silence mérite un enchaînement respectueux, pas un
 * chevauchement. On classe donc la fin en quatre familles à partir du signal
 * déjà décodé pour le tempo et la tonalité.
 */

export type OutroKind = 'silent' | 'cold' | 'quiet' | 'steady';

export interface TailInfo {
  kind: OutroKind;
  /** Secondes de silence audio en fin de fichier. */
  silence: number;
  /** Énergie de la fin / énergie du corps (1 = aussi fort). */
  ratio: number;
}

/** Seuil de silence : ~ -60 dBFS, tolère le dithering. */
const SILENCE_RMS = 0.001;
/** Fenêtre de détection du silence final. */
const SILENCE_WINDOW_SECONDS = 0.1;
/** Au-delà, on considère que le morceau se termine par un silence. */
const MIN_TRAILING_SILENCE = 1;
/** Fenêtre du corps, prise 10 s avant la fin pour ignorer le fade-out. */
const BODY_SECONDS = 10;
/** Fenêtre de la toute fin. */
const TAIL_SECONDS = 1.5;

function rms(samples: Float32Array, from: number, to: number): number {
  const step = 4; // approximation suffisante pour une décision de mixage
  let sum = 0;
  let count = 0;
  for (let i = from; i < to; i += step) {
    const value = samples[i];
    sum += value * value;
    count++;
  }
  return count > 0 ? Math.sqrt(sum / count) : 0;
}

/** Classe la fin d'un signal mono : silence, fin à froid, fade-out ou neutre. */
export function analyzeTail(samples: Float32Array, sampleRate: number): TailInfo | null {
  if (samples.length === 0 || sampleRate <= 0) return null;

  const end = samples.length;
  const window = Math.max(1, Math.floor(sampleRate * SILENCE_WINDOW_SECONDS));

  // Remonte les fenêtres silencieuses depuis la fin du fichier.
  let silentSamples = 0;
  for (let start = end - window; start >= 0; start -= window) {
    if (rms(samples, start, start + window) >= SILENCE_RMS) break;
    silentSamples += window;
  }
  const silence = silentSamples / sampleRate;
  if (silence >= MIN_TRAILING_SILENCE) {
    return { kind: 'silent', silence, ratio: 0 };
  }

  const bodyEnd = Math.max(0, end - Math.floor(sampleRate * BODY_SECONDS));
  const bodyStart = Math.max(0, bodyEnd - Math.floor(sampleRate * BODY_SECONDS));
  const body = bodyStart < bodyEnd ? rms(samples, bodyStart, bodyEnd) : rms(samples, 0, end);
  if (body <= 0) return null;

  const tailStart = Math.max(0, end - Math.floor(sampleRate * TAIL_SECONDS));
  const ratio = rms(samples, tailStart, end) / body;
  const kind: OutroKind = ratio < 0.35 ? 'quiet' : ratio > 0.8 ? 'cold' : 'steady';
  return { kind, silence, ratio };
}
