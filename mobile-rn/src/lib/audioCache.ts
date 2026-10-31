import { Directory, File, Paths } from 'expo-file-system';

import { selectEvictions } from './cachePolicy';
import { storage } from './storage';

interface CacheEntry {
  uri: string;
  url: string;
  bytes: number;
  /** Dernier usage (LRU). */
  usedAt: number;
}

export interface AudioCacheStats {
  bytes: number;
  count: number;
  limit: number;
}

const INDEX_KEY = 'mixify.audio-index.v1';
const LIMIT_KEY = 'mixify.audio-limit';
export const AUDIO_LIMIT_DEFAULT = 500 * 1024 * 1024;

const cacheDir = new Directory(Paths.cache, 'mixify-audio');
const inFlight = new Map<string, Promise<string>>();

function loadIndex(): Map<string, CacheEntry> {
  try {
    const raw = storage.getItem(INDEX_KEY);
    const entries = raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
    return new Map(Object.entries(entries));
  } catch {
    return new Map();
  }
}

let index = loadIndex();

function saveIndex(): void {
  try {
    storage.setItem(INDEX_KEY, JSON.stringify(Object.fromEntries(index)));
  } catch {
    /* stockage plein : l'index sera reconstruit au prochain prune */
  }
}

function ensureDir(): void {
  if (!cacheDir.exists) cacheDir.create({ intermediates: true, idempotent: true });
}

/** Identifiant de fichier stable et sûr pour le système de fichiers. */
function fileName(trackId: string, url: string): string {
  let hash = 5381;
  for (let position = 0; position < trackId.length; position += 1) {
    hash = (hash * 33) ^ trackId.charCodeAt(position);
  }
  const extension = /\.(mp3|m4a|aac|wav|ogg|opus)$/i.exec(url.split('?')[0])?.[0] ?? '.mp3';
  return `${(hash >>> 0).toString(36)}-${trackId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}${extension}`;
}

export function getAudioLimit(): number {
  const raw = storage.getItem(LIMIT_KEY);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : AUDIO_LIMIT_DEFAULT;
}

export function setAudioLimit(bytes: number): void {
  storage.setItem(LIMIT_KEY, String(bytes));
  trimAudioCache();
}

/** Chemin local du morceau, ou `null` s'il n'a jamais été téléchargé. */
export function getCachedAudio(trackId: string): string | null {
  const entry = index.get(trackId);
  if (!entry) return null;

  const file = new File(entry.uri);
  if (!file.exists || file.size <= 0) {
    index.delete(trackId);
    saveIndex();
    return null;
  }

  entry.usedAt = Date.now();
  saveIndex();
  return entry.uri;
}

/** Télécharge le morceau une seule fois, puis renvoie son chemin local. */
export function cacheAudio(trackId: string, url: string): Promise<string> {
  const entry = index.get(trackId);
  if (entry?.url === url) {
    const cached = getCachedAudio(trackId);
    if (cached) return Promise.resolve(cached);
  }

  const pending = inFlight.get(trackId);
  if (pending) return pending;

  const task = download(trackId, url).finally(() => inFlight.delete(trackId));
  inFlight.set(trackId, task);
  return task;
}

async function download(trackId: string, url: string): Promise<string> {
  ensureDir();
  const previous = index.get(trackId);
  const name = fileName(trackId, url);
  const target = new File(cacheDir, name);
  const partial = new File(cacheDir, `${name}.part`);

  try {
    if (partial.exists) partial.delete();
    await File.downloadFileAsync(url, partial, { idempotent: true });
    if (!partial.exists || partial.size <= 0) throw new Error('Téléchargement vide');
    if (target.exists) target.delete();
    await partial.move(target);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw error;
  }

  index.set(trackId, { uri: target.uri, url, bytes: target.size, usedAt: Date.now() });
  if (previous && previous.uri !== target.uri) {
    try {
      const stale = new File(previous.uri);
      if (stale.exists) stale.delete();
    } catch {
      /* ancien fichier déjà supprimé */
    }
  }
  saveIndex();
  trimAudioCache();
  return target.uri;
}

/** Supprime les fichiers orphelins puis les plus anciens au-delà de la limite. */
export function trimAudioCache(): void {
  const entries = [...index.entries()];
  let changed = false;
  for (const [trackId, entry] of entries) {
    const file = new File(entry.uri);
    if (!file.exists || file.size <= 0) {
      index.delete(trackId);
      changed = true;
    }
  }

  const limit = getAudioLimit();
  const alive = [...index.entries()];
  const evicted = selectEvictions(
    alive.map(([trackId, entry]) => ({ trackId, ...entry })),
    limit,
  );
  for (const entry of evicted) {
    try {
      const file = new File(entry.uri);
      if (file.exists) file.delete();
    } catch {
      /* fichier déjà supprimé par le système */
    }
    index.delete(entry.trackId);
  }

  if (changed || evicted.length > 0) saveIndex();
}

/** Au démarrage : répare l'index, nettoie les téléchargements interrompus. */
export function pruneAudioCache(): void {
  try {
    if (cacheDir.exists) {
      for (const item of cacheDir.list()) {
        if (item instanceof File && item.name.endsWith('.part')) item.delete();
      }
    }
  } catch {
    /* cache inaccessible : rien à nettoyer */
  }
  trimAudioCache();
}

export function getAudioCacheStats(): AudioCacheStats {
  let bytes = 0;
  for (const entry of index.values()) bytes += entry.bytes;
  return { bytes, count: index.size, limit: getAudioLimit() };
}

export function clearAudioCache(): void {
  index = new Map();
  inFlight.clear();
  try {
    if (cacheDir.exists) cacheDir.delete();
  } catch {
    /* supprimé par le système */
  }
  saveIndex();
}
