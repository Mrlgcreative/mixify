import type { Track } from '../types/music';

/**
 * Générateur audio de démonstration.
 *
 * Le mode démo a besoin de vrais flux audio **locaux** pour que l'Auto-Mix
 * soit vérifiable (le crossfade se joue sur de la vraie musique, pas sur des
 * balises HTML). On synthétise donc des pistes WAV (PCM 16 bits mono) dans le
 * navigateur : le blob est same-origin, donc la Web Audio API peut le traiter
 * sans contrainte CORS.
 *
 * Le tempo est exact, ce qui permet de vérifier le beat-sync.
 */

const SAMPLE_RATE = 22050;
const CACHE = new Map<string, string>();

function freq(semitone: number): number {
  // La4 = 440 Hz (semitone 0), soit 12 demi-tons par octave.
  return 440 * Math.pow(2, semitone / 12);
}

interface RenderOptions {
  duration: number;
  bpm: number;
  /** Hauteur de la tonique, en demi-tons au-dessus de La4. */
  root: number;
  /** Variation de hauteur (semitones) pour distinguer les morceaux. */
  motif: number;
}

/** Rend une piste et renvoie un Blob WAV. */
function renderWav({ duration, bpm, root, motif }: RenderOptions): Blob {
  const total = Math.floor(SAMPLE_RATE * duration);
  const buffer = new Float32Array(total);
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = Math.ceil(duration / bar);

  // Progression : I - V - vi - IV (en degrés de la tonique).
  const degrees = [0, 7, 9, 5];

  for (let b = 0; b < bars; b++) {
    const degree = degrees[b % degrees.length];
    const chordRoot = root + degree;

    // --- Basse (onde sine, une note par temps) ---
    for (let t = 0; t < 4; t++) {
      const start = Math.floor((b * bar + t * beat) * SAMPLE_RATE);
      const len = Math.floor(beat * 0.95 * SAMPLE_RATE);
      const f = freq(chordRoot - 12);
      for (let i = 0; i < len && start + i < total; i++) {
        const time = i / SAMPLE_RATE;
        const env = Math.exp(-time * 4.5) * (1 - Math.exp(-time * 220));
        buffer[start + i] += Math.sin(2 * Math.PI * f * time) * env * 0.32;
      }
    }

    // --- Accord (pad) : triade avec léger mouvement d'arpège ---
    const chordStart = Math.floor(b * bar * SAMPLE_RATE);
    const chordLen = Math.floor(bar * SAMPLE_RATE);
    for (let i = 0; i < chordLen && chordStart + i < total; i++) {
      const time = i / SAMPLE_RATE;
      const env = Math.min(1, time * 6) * Math.exp(-time * 0.9);
      const swell = 0.5 + 0.5 * Math.sin((2 * Math.PI * time) / bar);
      let sample = 0;
      for (const interval of [0, 3, 7]) {
        sample += Math.sin(2 * Math.PI * freq(chordRoot + interval) * time);
      }
      buffer[chordStart + i] += (sample / 3) * env * (0.1 + 0.05 * swell);
    }

    // --- Arpège (pluck) : motive sur les notes de l'accord ---
    const arp = [0, 3, 7, 12 + motif];
    for (let s = 0; s < 8; s++) {
      const start = Math.floor((b * bar + s * (beat / 2)) * SAMPLE_RATE);
      const len = Math.floor(beat * 0.6 * SAMPLE_RATE);
      const f = freq(chordRoot + arp[s % arp.length] + (s >= 4 ? motif : 0));
      for (let i = 0; i < len && start + i < total; i++) {
        const time = i / SAMPLE_RATE;
        const env = Math.exp(-time * 9) * (1 - Math.exp(-time * 400));
        buffer[start + i] += Math.sin(2 * Math.PI * f * time) * env * 0.14;
      }
    }

    // --- Kick sur chaque temps ---
    for (let t = 0; t < 4; t++) {
      const start = Math.floor((b * bar + t * beat) * SAMPLE_RATE);
      const len = Math.floor(0.16 * SAMPLE_RATE);
      for (let i = 0; i < len && start + i < total; i++) {
        const time = i / SAMPLE_RATE;
        const env = Math.exp(-time * 22);
        const f = 48 + 90 * Math.exp(-time * 34);
        buffer[start + i] += Math.sin(2 * Math.PI * f * time) * env * 0.62;
      }
    }

    // --- Charley sur les contretemps ---
    for (let t = 0; t < 4; t++) {
      const start = Math.floor((b * bar + t * beat + beat / 2) * SAMPLE_RATE);
      const len = Math.floor(0.05 * SAMPLE_RATE);
      for (let i = 0; i < len && start + i < total; i++) {
        const time = i / SAMPLE_RATE;
        const env = Math.exp(-time * 90);
        buffer[start + i] += (Math.random() * 2 - 1) * env * 0.07;
      }
    }
  }

  // Normalisation (le mixage ci-dessus peut dépasser 1).
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(buffer[i]));
  const gain = peak > 0 ? 0.92 / peak : 1;

  // Encodage PCM 16 bits little-endian + en-tête RIFF/WAVE.
  const dataSize = total * 2;
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < total; i++) {
    const sample = Math.max(-1, Math.min(1, buffer[i] * gain));
    view.setInt16(44 + i * 2, sample * 0x7fff, true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

/** URL (blob) du flux audio d'une piste de démonstration. */
export function getDemoStreamUrl(track: Track): string {
  const cached = CACHE.get(track.id);
  if (cached) return cached;

  const seed = track.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const root = -9 + (seed % 7); // tonique autour de La3
  const motif = [0, 2, 5, 7, 9][seed % 5];
  const blob = renderWav({
    duration: track.duration,
    bpm: track.bpm ?? 120,
    root,
    motif,
  });
  const url = URL.createObjectURL(blob);
  CACHE.set(track.id, url);
  return url;
}
