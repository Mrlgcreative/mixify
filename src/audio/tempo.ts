/**
 * Estimation de tempo côté client — module pur (Float32Array → résultat).
 *
 * Aucune API publique (iTunes, Jamendo…) ne fournit de BPM, pourtant le
 * beat-sync de l'Auto-Mix en a besoin. On l'estime donc sur le signal lui-même :
 *   1. enveloppe d'attaques : flux positif du RMS fenêtré (frames de 512 éch.) ;
 *   2. filtrage en peigne (comb) sur 70–180 BPM, mené **indépendamment sur
 *      chaque moitié** de la fenêtre d'analyse (cherche BPM + phase) ;
 *   3. les deux moitiés doivent s'accorder (±1 BPM et phase mod période ≤
 *      période/8) pour retenir l'estimation.
 *
 * Garde anti-fausse-positive : une fouille de ~28 000 grilles trouve toujours
 * de la « chance » sur du bruit blanc (mesuré : score 8,5 contre 3–8 pour la
 * vraie musique sur la fenêtre entière). La chance ne se répète pas entre deux
 * moitiés indépendantes ; un vrai rythme stable, si. Les intros sans pulsation
 * nette échouent aussi cet accord → BPM nul → fondu simple correct, jamais un
 * mauvais BPM (qui décalerait les downbeats de ~300 ms).
 *
 * shortcut: suppose un tempo constant sur les 20 premières secondes analysées ;
 * une piste à changement de tempo est rejetée (pas de risque de grille fausse).
 */

export interface TempoEstimate {
  /** BPM estimé, arrondi au quart de temps dans [70, 180]. */
  bpm: number;
  /** Temps (s depuis le début du signal) de la première pulsation de grille. */
  phase: number;
  /** Score des moitiés (le plus faible des deux) ; ≈ 1 = bruit, ≫ 1 = rythme. */
  confidence: number;
}

/**
 * Score minimal du grid le plus faible des deux moitiés. Calibré en réel sur
 * des extraits iTunes/Deezer : les titres rythmiques retenus mesurent 4–7,
 * le bruit blanc reste sous 1. Le seuil sert de marge double — un titre dont
 * les moitiés s'accordent mais faiblement (intros sans pulsation) tombe ici.
 */
export const MIN_CONFIDENCE = 1.5;

const MIN_BPM = 70;
const MAX_BPM = 180;
/** Pas d'analyse en échantillons (≈ 86 grilles/s à 44,1 kHz). */
const HOP = 512;
/** Fouille de phase par période : résolution ≈ période/64 (≈ 7 ms). */
const PHASE_STEPS = 64;
/** Fenêtre d'analyse : assez pour ~30 pulsations, limité en coût. */
const ANALYSIS_SECONDS = 20;
/** Sous ce seuil le signal est trop court pour estimer un tempo fiable. */
const MIN_SECONDS = 4;
/** Tolérance d'accord entre les deux moitiés (BPM). */
const BPM_AGREEMENT = 1;

interface GridHit {
  bpm: number;
  phase: number;
  score: number;
}

/**
 * Estime BPM et phase d'un signal mono. Retourne `null` si le signal est trop
 * court, silencieux, ou si les deux moitiés ne s'accordent pas.
 */
export function estimateTempo(samples: Float32Array, sampleRate: number): TempoEstimate | null {
  if (sampleRate <= 0) return null;
  const frames = Math.floor(samples.length / HOP);
  if (frames < Math.floor((MIN_SECONDS * sampleRate) / HOP)) return null;
  const usable = Math.min(frames, Math.floor((ANALYSIS_SECONDS * sampleRate) / HOP));
  const fps = sampleRate / HOP;

  // Enveloppe d'attaques : flux positif du RMS.
  const envelope = new Float32Array(usable);
  let previous = 0;
  for (let i = 0; i < usable; i++) {
    const base = i * HOP;
    let sum = 0;
    for (let j = 0; j < HOP; j++) {
      const value = samples[base + j];
      sum += value * value;
    }
    const rms = Math.sqrt(sum / HOP);
    envelope[i] = rms > previous ? rms - previous : 0;
    previous = rms;
  }

  const split = Math.floor(usable / 2);
  const first = searchGrid(envelope, 0, split, fps);
  const second = searchGrid(envelope, split, usable, fps);
  if (!first || !second) return null;

  // Accord obligatoire : même tempo, grille alignée (les phases sont
  // absolues, comptées depuis le début du signal des deux côtés).
  if (Math.abs(first.bpm - second.bpm) > BPM_AGREEMENT) return null;
  const period = (60 / first.bpm) * fps;
  const phaseGap = Math.abs(first.phase - second.phase);
  if (Math.min(phaseGap, period - phaseGap) > period / 8) return null;

  const winner = first.score >= second.score ? first : second;
  const confidence = Math.min(first.score, second.score);
  if (confidence < MIN_CONFIDENCE) return null;
  return { bpm: winner.bpm, phase: winner.phase / fps, confidence };
}

/** Meilleur couple (BPM, phase) sur une plage, par filtrage en peigne. */
function searchGrid(
  envelope: Float32Array,
  from: number,
  to: number,
  fps: number,
): GridHit | null {
  const baseline = meanOf(envelope, from, to);
  if (!(baseline > 0)) return null;

  let best: GridHit | null = null;
  for (let quarter = MIN_BPM * 4; quarter <= MAX_BPM * 4; quarter++) {
    const period = (60 / (quarter / 4)) * fps; // période en frames
    for (let step = 0; step < PHASE_STEPS; step++) {
      const phase = (step / PHASE_STEPS) * period;
      const score = gridMean(envelope, phase, period, from, to, baseline);
      if (score !== null && (!best || score > best.score)) {
        best = { bpm: quarter / 4, phase, score };
      }
    }
  }
  return best;
}

/** Moyenne de l'enveloppe sur [from, to). */
function meanOf(envelope: Float32Array, from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += envelope[i];
  return to > from ? sum / (to - from) : 0;
}

/** Énergie moyenne sur la grille (phase + k×période) dans [from, to),
 *  rapportée à `baseline` (énergie moyenne de la plage). `null` si < 4 points. */
function gridMean(
  envelope: Float32Array,
  phase: number,
  period: number,
  from: number,
  to: number,
  baseline: number,
): number | null {
  if (!(baseline > 0)) return null;
  let sum = 0;
  let taps = 0;
  for (let pos = phase; pos < to; pos += period) {
    if (pos < from) continue;
    const index = Math.floor(pos);
    const frac = pos - index;
    sum +=
      index + 1 < to
        ? envelope[index] * (1 - frac) + envelope[index + 1] * frac
        : envelope[index];
    taps++;
  }
  if (taps < 4) return null;
  return sum / taps / baseline;
}
