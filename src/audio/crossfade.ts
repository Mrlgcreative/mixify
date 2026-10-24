/**
 * Moteur de transition "Auto-Mix" — calculs purs, sans dépendance DOM.
 * Ce module est volontairement isolé : il ne contient que des fonctions pures
 * (calcul de courbes, de tempo et d'alignement rythmique) afin d'être testable
 * hors navigateur (voir crossfade.test.ts).
 */

/** Hypothèse métrique : 4 temps par mesure. */
export const BEATS_PER_BAR = 4;

/** Bornes du réglage utilisateur (secondes). */
export const MIN_CROSSFADE_SECONDS = 0;
export const MAX_CROSSFADE_SECONDS = 12;

/** Durée d'une pulsation (s). */
export function beatInterval(bpm: number): number {
  return 60 / bpm;
}

/** Durée d'une mesure (s). */
export function barInterval(bpm: number): number {
  return BEATS_PER_BAR * beatInterval(bpm);
}

/**
 * Ratio de lecture à appliquer au titre de tempo `bpmB` pour l'aligner sur
 * `bpmA` (résultat = bpmA/bpmB). Plafonné à ±8 % : au-delà, le pitch devient
 * désagréable et le "beat-match" perd son intérêt.
 */
export function tempoRatio(outBpm: number, inBpm: number, maxDeviation = 0.08): number {
  if (!outBpm || !inBpm || outBpm <= 0 || inBpm <= 0) return 1;
  const ratio = outBpm / inBpm;
  return Math.min(1 + maxDeviation, Math.max(1 - maxDeviation, ratio));
}

/**
 * Courbes de volume à puissance constante (equal-power).
 * `sin`/`cos` garantissent une somme d'énergie constante : le niveau perçu ne
 * « creuse » pas au milieu du fondu, contrairement à une interpolation linéaire.
 */
export function equalPowerCurves(
  duration: number,
  steps = 128,
): { fadeIn: Float32Array; fadeOut: Float32Array } {
  const fadeIn = new Float32Array(steps);
  const fadeOut = new Float32Array(steps);
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 1 : i / (steps - 1);
    fadeIn[i] = Math.sin((t * Math.PI) / 2);
    fadeOut[i] = Math.cos((t * Math.PI) / 2);
  }
  // `duration` n'intervient pas dans la forme de la courbe (l'AudioParam gère
  // l'étalement temporel), on le garde dans la signature pour documenter l'usage.
  void duration;
  return { fadeIn, fadeOut };
}

/**
 * Durée de fondu réellement appliquée :
 *  - un `cut` est quasi instantané (0,08 s, juste de quoi éviter le clic) ;
 *  - une durée proposée par l'IA est bornée à 1–16 s ;
 *  - sinon on garde le réglage utilisateur.
 * Dans tous les cas, jamais plus que ce qu'il reste à jouer.
 */
export function resolveFadeDuration(
  transition: { style: string; duration: number } | null,
  fallback: number,
  remaining: number,
): number {
  const requested =
    transition?.style === 'cut'
      ? 0.08
      : transition
        ? Math.min(16, Math.max(1, Number(transition.duration) || 4))
        : Math.max(0, fallback);

  return Math.min(requested, Math.max(0, remaining));
}

export interface BeatSyncParams {
  /** Position média courante du titre sortant (s). */
  position: number;
  /** Durée totale du titre sortant (s). */
  duration: number;
  /** Durée du fondu (s). */
  crossfade: number;
  /** BPM du titre sortant. */
  outBpm: number;
  /** BPM du titre entrant. */
  inBpm: number;
  /**
   * Temps média (s depuis le début du titre) de la première pulsation du
   * titre sortant. Déduit de l'estimation de tempo ; 0 par défaut (grille
   * supposée partir du début du morceau).
   */
  outPhase?: number;
  /** Idem pour le titre entrant. */
  inPhase?: number;
  /** Lecture en temps réel du titre sortant (1 = normale). */
  outRate: number;
  /** Anticipation du titre entrant avant le début du fondu (s). */
  leadIn: number;
  /** Durée totale du titre entrant (s). */
  inDuration: number;
}

export interface BeatSyncResult {
  /** Début du fondu, en secondes réelles relatives à "maintenant". */
  fadeStart: number;
  /** Position média à laquelle le titre entrant doit démarrer (s). */
  inOffset: number;
  /**
   * Ratio de lecture à appliquer au **titre sortant** pendant la transition :
   * c'est lui qui prend le tempo du titre entrant (borné à ±8 %). Le titre
   * entrant joue toujours à sa vitesse naturelle.
   */
  outgoingRate: number;
  /** Instant du premier downbeat entrant, relatif à "maintenant" (s). */
  downbeatAt: number;
}

/**
 * Calcule le plan d'un fondu "intelligent" :
 *  1. le fondu commence exactement `crossfade` secondes avant la fin du titre
 *     sortant (aucun trou de silence, aucun chevauchement inutile) ;
 *  2. le titre **sortant** prend le tempo du titre entrant (±8 %) : suivant
 *     plus rapide → il accélère, suivant plus lent → il ralentit. L'entrée
 *     joue à sa vitesse naturelle ;
 *  3. une pulsation entrante tombe sur une pulsation du titre sortant,
 *     ce qui produit un passage rythmiquement propre.
 *
 * Si seul le BPM du titre entrant est connu (estimation encore en cours pour
 * le sortant), c'est son rythme qui cadence l'entrée : sa pulsation tombe
 * exactement au début du fondu. Sans BPM entrant, retour à un fondu simple.
 *
 * shortcut: les "downbeats" sortants sont approximés par les pulsations
 * (l'estimation donne la grille de battements, pas le début de mesure réel) ;
 * l'alignement rythmique tient (les deux grilles restent accordées), seule la
 * position dans la mesure peut être approximative.
 */
export function planBeatSync(params: BeatSyncParams): BeatSyncResult {
  const { position, duration, crossfade, outBpm, inBpm, outRate, leadIn, inDuration } = params;
  const outPhase = params.outPhase ?? 0;
  const inPhase = params.inPhase ?? 0;
  // Temps réel restant : la conversion média → réel passe par une division
  // par le ratio de lecture (×2 = deux fois plus vite = deux fois moins long).
  const remaining = Math.max(0, (duration - position) / outRate);
  // Le fondu doit se terminer exactement avec la fin du titre sortant.
  const fadeStart = Math.max(0, remaining - crossfade);

  if (!inBpm) {
    // Aucun BPM entrant : pas d'alignement rythmique possible.
    return { fadeStart, inOffset: 0, outgoingRate: 1, downbeatAt: fadeStart };
  }

  // Le titre entrant démarre `leadIn` avant le fondu.
  const startAt = Math.max(0, fadeStart - leadIn);
  const beatIn = beatInterval(inBpm);

  if (!outBpm) {
    // Seul le titre entrant est analysé : sa pulsation tombe exactement au
    // début du fondu — c'est le rythme de la chanson suivante qui cadence
    // l'entrée (tempo inchangé, pas de grille sortante à suivre).
    const elapsed = fadeStart - startAt;
    const j = Math.ceil((elapsed - inPhase) / beatIn);
    const inOffset = inPhase + j * beatIn - elapsed;
    if (inOffset < 0 || inOffset > inDuration - 1) {
      return { fadeStart, inOffset: 0, outgoingRate: 1, downbeatAt: fadeStart };
    }
    return { fadeStart, inOffset, outgoingRate: 1, downbeatAt: fadeStart };
  }

  // C'est le titre sortant qui prend le tempo du suivant (±8 %).
  const outgoingRate = tempoRatio(inBpm, outBpm);

  // Grille du sortant, en tenant compte du changement de tempo à `startAt`.
  const mediaAtStart = position + startAt * outRate;
  const mediaAtFade = mediaAtStart + (fadeStart - startAt) * outgoingRate;
  const barOut = barInterval(outBpm);
  const k = Math.max(0, Math.ceil((mediaAtFade - outPhase) / barOut));
  const downbeatMedia = outPhase + k * barOut;
  const downbeatAt = startAt + (downbeatMedia - mediaAtStart) / outgoingRate;

  // On décale l'entrée (vitesse naturelle) pour qu'une pulsation tombe là.
  const elapsedReal = downbeatAt - startAt;
  const j = Math.ceil((elapsedReal - inPhase) / beatIn);
  const inOffset = inPhase + j * beatIn - elapsedReal;

  // Pas d'alignement si le titre entrant est trop court pour être décalé.
  if (inOffset < 0 || inOffset > inDuration - 1) {
    return { fadeStart, inOffset: 0, outgoingRate: 1, downbeatAt };
  }
  return { fadeStart, inOffset, outgoingRate, downbeatAt };
}
