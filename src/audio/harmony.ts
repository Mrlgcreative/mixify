/**
 * Harmonie côté client — détection de tonalité et compatibilité "Camelot".
 * Module pur (Float32Array → résultat), testable hors navigateur.
 *
 * Aucune API ne fournit la tonalité des morceaux du catalogue (champ `key`
 * vide). On l'estime sur le signal décodé :
 *   1. réduction du chromagramme (12 classes de hauteur) par filtres de
 *      Goertzel sur 3 octaves, après décimation du signal ;
 *   2. corrélation avec les profils de Krumhansl-Kessler (majeur/mineur) ;
 *   3. l'estimation n'est retenue que si les deux moitiés du morceau tombent
 *      sur la même tonalité — sinon `confidence` = 0 et le mix ne s'en sert pas.
 */

export type KeyMode = 'major' | 'minor';

export interface KeyEstimate {
  /** Classe de hauteur de la tonique (0 = do, 1 = do dièse, … 11 = si). */
  pitchClass: number;
  mode: KeyMode;
  /** 1 = les deux moitiés du morceau confirment la tonalité, 0 = douteuse. */
  confidence: number;
}

/** Profils de Krumhansl-Kessler (majeur / mineur), do en premier. */
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Numéro Camelot par classe de hauteur pour un ton majeur (0 = C → 8B). */
const MAJOR_NUMBER = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];

const TARGET_RATE = 11025;
const ANALYSIS_SECONDS = 20;
const MIN_SECONDS = 6;
const WINDOW = 2048;
const HOP = 1024;
/** Notes analysées : do2 (65 Hz) à si4 (988 Hz), 3 octaves. */
const LOWEST_MIDI = 36;
const TONES = 36;
/** Corrélation minimale avec le profil retenu (0 = bruit, 1 = parfait). */
const MIN_SCORE = 0.4;
/**
 * Relief minimal du chromagramme : (3 classes dominantes) / moyenne. La
 * musique tonale mesurée tourne autour de 2, le bruit blanc sous 1,2.
 */
const MIN_PEAKED = 1.5;

let hann: Float32Array | null = null;
function hannWindow(size: number): Float32Array {
  if (hann && hann.length === size) return hann;
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  hann = window;
  return window;
}

/** Décime le signal à ~11 kHz après un double passe-bas (anti-repliement). */
function decimate(samples: Float32Array, sampleRate: number): { data: Float32Array; rate: number } {
  const step = Math.max(1, Math.round(sampleRate / TARGET_RATE));
  const rate = sampleRate / step;
  const count = Math.min(Math.floor(samples.length / step), Math.floor(ANALYSIS_SECONDS * rate));
  const data = new Float32Array(count);
  const alpha = 1 - Math.exp((-2 * Math.PI * 1200) / rate);
  let first = 0;
  let second = 0;
  for (let i = 0; i < count; i++) {
    first += alpha * (samples[i * step] - first);
    second += alpha * (first - second);
    data[i] = second;
  }
  return { data, rate };
}

function goertzel(data: Float32Array, from: number, length: number, freq: number, rate: number): number {
  const window = hannWindow(length);
  const coeff = 2 * Math.cos((2 * Math.PI * freq) / rate);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < length; i++) {
    const s0 = data[from + i] * window[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - coeff * s1 * s2)) / length;
}

/** Chromagramme : énergie par classe de hauteur sur une plage de fenêtres. */
function chroma(data: Float32Array, rate: number, from: number, to: number): Float32Array {
  const vector = new Float32Array(12);
  const freqs = new Float32Array(TONES);
  for (let i = 0; i < TONES; i++) {
    freqs[i] = 440 * 2 ** ((LOWEST_MIDI + i - 69) / 12);
  }
  for (let start = from; start + WINDOW <= to; start += HOP) {
    for (let i = 0; i < TONES; i++) {
      vector[(LOWEST_MIDI + i) % 12] += goertzel(data, start, WINDOW, freqs[i], rate);
    }
  }
  return vector;
}

function correlation(chromaVector: Float32Array, profile: number[], rotation: number): number {
  const n = 12;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i++) {
    meanA += chromaVector[i];
    meanB += profile[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const a = chromaVector[(i + rotation) % 12] - meanA;
    const b = profile[i] - meanB;
    num += a * b;
    denA += a * a;
    denB += b * b;
  }
  return denA > 0 && denB > 0 ? num / Math.sqrt(denA * denB) : 0;
}

/** Meilleure tonalité (tonique + mode) pour un chromagramme. */
function bestKey(vector: Float32Array): { pitchClass: number; mode: KeyMode; score: number } {
  let best = { pitchClass: 0, mode: 'major' as KeyMode, score: -Infinity };
  for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
    const major = correlation(vector, MAJOR_PROFILE, pitchClass);
    const minor = correlation(vector, MINOR_PROFILE, pitchClass);
    if (major > best.score) best = { pitchClass, mode: 'major', score: major };
    if (minor > best.score) best = { pitchClass, mode: 'minor', score: minor };
  }
  return best;
}

/**
 * Détecte la tonalité d'un signal mono. Retourne `null` si le signal est trop
 * court ou si les deux moitiés ne tombent pas sur la même tonalité.
 */
export function detectKey(samples: Float32Array, sampleRate: number): KeyEstimate | null {
  if (sampleRate <= 0) return null;
  const { data, rate } = decimate(samples, sampleRate);
  if (data.length < MIN_SECONDS * rate) return null;
  const middle = Math.floor(data.length / 2);

  const first = bestKey(chroma(data, rate, 0, middle));
  const second = bestKey(chroma(data, rate, middle, data.length));
  const whole = chroma(data, rate, 0, data.length);
  const overall = bestKey(whole);
  const sorted = [...whole].sort((a, b) => b - a);
  const mean = whole.reduce((sum, v) => sum + v, 0) / 12;
  const peaked = mean > 0 ? (sorted[0] + sorted[1] + sorted[2]) / (3 * mean) : 0;

  // Les deux moitiés doivent rester dans le voisinage harmonique de la
  // tonalité globale (une modulation C→G reste valable, un bruit non).
  if (harmonicCost(overall, first) > 1 || harmonicCost(overall, second) > 1) return null;
  if (overall.score < MIN_SCORE) return null;
  // Un chromagramme plat (bruit, percussion seule) ne désigne pas de tonalité.
  if (peaked < MIN_PEAKED) return null;
  return { pitchClass: overall.pitchClass, mode: overall.mode, confidence: 1 };
}

/** Position Camelot d'une tonalité (numéro 1–12 + lettre A mineur / B majeur). */
export function camelot(key: { pitchClass: number; mode: KeyMode }): { number: number; letter: 'A' | 'B' } {
  const number =
    key.mode === 'major'
      ? MAJOR_NUMBER[key.pitchClass]
      : MAJOR_NUMBER[(key.pitchClass + 3) % 12];
  return { number, letter: key.mode === 'major' ? 'B' : 'A' };
}

/**
 * Coût harmonique de deux tonalités (0 = même tonalité, 3 = dissonance).
 * Règles Camelot : même clé, voisin (±1 même lettre), relatif majeur/mineur
 * (même numéro) et diagonale restent mixables ; deux crans d'écart ou plus
 * avec changement de mode sonnent faux sur un fondu long.
 */
export function harmonicCost(
  a: { pitchClass: number; mode: KeyMode },
  b: { pitchClass: number; mode: KeyMode },
): number {
  const first = camelot(a);
  const second = camelot(b);
  const gap = Math.abs(first.number - second.number);
  const distance = Math.min(gap, 12 - gap);
  if (first.letter === second.letter) {
    if (distance === 0) return 0;
    if (distance === 1) return 1;
    if (distance === 2) return 2;
    return 3;
  }
  if (distance === 0) return 1;
  if (distance === 1) return 2;
  return 3;
}

/** Durée maximale d'un fondu entre deux tonalités éloignées (secondes). */
const CLASH_FADE_SECONDS = 1.2;

/**
 * Raccourcit le fondu quand les tonalités sont incompatibles : au-delà d'un
 * voisin Camelot, une superposition longue « sonne faux ». Les tonalités
 * inconnues (détection non concluante) ne changent rien.
 */
export function harmonicFadeCap(
  fadeDuration: number,
  a: { pitchClass: number; mode: KeyMode } | null,
  b: { pitchClass: number; mode: KeyMode } | null,
): number {
  if (!a || !b || harmonicCost(a, b) <= 1) return fadeDuration;
  return Math.min(fadeDuration, CLASH_FADE_SECONDS);
}
