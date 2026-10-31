import { storage } from './storage';

export interface CacheMetrics {
  /** Écrans ouverts avec des données déjà en cache. */
  reads: number;
  hits: number;
  /** Temps cumulé entre `play()` et le premier statut « chargé ». */
  playbackStarts: number;
  playbackStartMs: number;
  /** Lectures servies depuis le cache audio local. */
  audioHits: number;
}

const KEY = 'mixify.metrics';
const EMPTY: CacheMetrics = {
  reads: 0,
  hits: 0,
  playbackStarts: 0,
  playbackStartMs: 0,
  audioHits: 0,
};

function load(): CacheMetrics {
  try {
    return { ...EMPTY, ...(JSON.parse(storage.getItem(KEY) ?? '{}') as Partial<CacheMetrics>) };
  } catch {
    return { ...EMPTY };
  }
}

let metrics = load();
let writes = 0;

/** Les écritures sont groupées : les métriques ne doivent pas ralentir l'UI. */
function save(force = false) {
  writes += 1;
  if (!force && writes % 10 !== 0) return;
  try {
    storage.setItem(KEY, JSON.stringify(metrics));
  } catch {
    /* stockage indisponible : métriques en mémoire */
  }
}

export function recordCacheRead(hit: boolean): void {
  metrics.reads += 1;
  if (hit) metrics.hits += 1;
  save();
}

export function recordPlaybackStart(ms: number): void {
  metrics.playbackStarts += 1;
  metrics.playbackStartMs += Math.max(0, ms);
  save();
}

export function recordAudioHit(): void {
  metrics.audioHits += 1;
  save();
}

export function getMetrics(): CacheMetrics {
  return { ...metrics };
}

export function resetMetrics(): void {
  metrics = { ...EMPTY };
  save(true);
}
