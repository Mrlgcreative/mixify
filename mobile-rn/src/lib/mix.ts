import type { RepeatMode, TransitionMode } from '@/types/music';

/** Bornes du fondu enchaîné réglable (secondes). */
export const MIN_CROSSFADE_SECONDS = 1;
export const MAX_CROSSFADE_SECONDS = 12;
/** Durée cible de l'AutoMix mobile. */
export const AUTOMIX_SECONDS = 10;

/**
 * Durée réelle du fondu : jamais plus de 30 % du titre, pour ne pas manger un
 * interlude court. L'AutoMix reste à 10 s, le fondu simple suit le réglage.
 */
export function fadeSecondsFor(
  style: TransitionMode,
  crossfadeSeconds: number,
  duration: number,
): number {
  if (style === 'off') return 0;
  const desired =
    style === 'automix'
      ? AUTOMIX_SECONDS
      : Math.min(MAX_CROSSFADE_SECONDS, Math.max(MIN_CROSSFADE_SECONDS, crossfadeSeconds));
  if (!Number.isFinite(duration) || duration <= 0) return desired;
  return Math.min(desired, duration * 0.3);
}

/**
 * Courbes à puissance constante : la somme d'énergie reste stable, donc le
 * niveau perçu ne creuse pas au milieu du fondu.
 */
export function fadeVolumes(progress: number): { out: number; in: number } {
  const t = Math.min(1, Math.max(0, progress));
  return {
    out: Math.cos((t * Math.PI) / 2),
    in: Math.sin((t * Math.PI) / 2),
  };
}

/**
 * Index suivant, avec les mêmes règles que la file : boucle en fin de liste,
 * aléatoire sur les autres titres, arrêt à la fin quand la répétition est
 * désactivée. `null` = pas de titre suivant.
 */
export function nextIndexFor(
  params: {
    index: number;
    length: number;
    shuffle: boolean;
    repeat: RepeatMode;
  },
  random: () => number = Math.random,
): number | null {
  const { index, length, shuffle, repeat } = params;
  if (length <= 0) return null;

  if (shuffle) {
    if (length === 1) return 0;
    return (index + 1 + Math.floor(random() * (length - 1))) % length;
  }
  if (index + 1 < length) return index + 1;
  return repeat === 'all' ? 0 : null;
}

/** Rapproche le BPM entrant du sortant à l'octave la plus proche. */
function matchOctave(outBpm: number, inBpm: number): number {
  let best = inBpm;
  let distance = Infinity;
  for (const factor of [0.5, 1, 2]) {
    const candidate = inBpm * factor;
    const candidateDistance = Math.abs(Math.log(candidate / outBpm));
    if (candidateDistance < distance) {
      best = candidate;
      distance = candidateDistance;
    }
  }
  return best;
}

/**
 * Ratio à appliquer au titre sortant pour que son tempo rejoigne l'entrant,
 * plafonné à ±8 % : au-delà, la déformation s'entend. 1 = pas d'alignement.
 */
export function tempoMatchRate(
  outBpm?: number | null,
  inBpm?: number | null,
  maxDeviation = 0.08,
): number {
  if (!outBpm || !inBpm || outBpm <= 0 || inBpm <= 0) return 1;
  const ratio = matchOctave(outBpm, inBpm) / outBpm;
  return Math.min(1 + maxDeviation, Math.max(1 - maxDeviation, ratio));
}
