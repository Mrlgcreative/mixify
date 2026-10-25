import { api } from '../api/musicApi';
import type { Track } from '../types/music';
import { canDownloadNow } from '../utils/dataSaver';

/**
 * Téléchargements pour la lecture hors ligne.
 *
 * Les fichiers audio sont mis en cache via l'API Cache (disponible en HTTPS et
 * sur localhost). Les métadonnées (titre complet + URL) restent dans
 * localStorage pour retrouver et jouer les titres sans réseau.
 */

const CACHE_NAME = 'mixify-audio-v1';
const META_KEY = 'mixify.downloads';
const CHANGE_EVENT = 'mixify:downloads';

export interface DownloadEntry {
  url: string;
  track: Track;
}

/** URL blob réutilisées pendant la session (évite de relire le cache). */
const blobUrls = new Map<string, string>();

function notifyChange(): void {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Abonnement aux ajouts/suppressions (bibliothèque, réglages). */
export function onDownloadsChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

function readMeta(): Record<string, DownloadEntry> {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DownloadEntry>) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, DownloadEntry>): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* stockage plein ou indisponible : le cache audio reste, la liste non */
  }
}

export function downloadsSupported(): boolean {
  return typeof caches !== 'undefined';
}

export function listDownloads(): DownloadEntry[] {
  return Object.values(readMeta());
}

export function isDownloaded(trackId: string): boolean {
  return Boolean(readMeta()[trackId]);
}

/** Télécharge un titre (Wi-Fi requis selon les préférences). */
export async function downloadTrack(track: Track): Promise<void> {
  if (!downloadsSupported()) {
    throw new Error('Le téléchargement hors ligne n’est pas pris en charge par ce navigateur.');
  }
  if (isDownloaded(track.id)) return;
  if (!canDownloadNow()) {
    throw new Error('Téléchargement en attente : connectez-vous au Wi-Fi (ou désactivez « Wi-Fi uniquement »).');
  }

  const url = await api.getStreamUrl(track);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement impossible (${response.status}).`);

  const cache = await caches.open(CACHE_NAME);
  await cache.put(url, response);

  const meta = readMeta();
  meta[track.id] = { url, track };
  writeMeta(meta);
  notifyChange();
}

export async function removeDownload(trackId: string): Promise<void> {
  const meta = readMeta();
  const entry = meta[trackId];
  if (!entry) return;

  if (downloadsSupported()) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(entry.url);
  }
  const blob = blobUrls.get(trackId);
  if (blob) {
    URL.revokeObjectURL(blob);
    blobUrls.delete(trackId);
  }
  delete meta[trackId];
  writeMeta(meta);
  notifyChange();
}

export async function clearDownloads(): Promise<void> {
  if (downloadsSupported()) await caches.delete(CACHE_NAME);
  for (const blob of blobUrls.values()) URL.revokeObjectURL(blob);
  blobUrls.clear();
  writeMeta({});
  notifyChange();
}

/** URL locale à donner au lecteur, ou null si le titre n'est pas téléchargé. */
export async function offlineUrl(trackId: string): Promise<string | null> {
  const cached = blobUrls.get(trackId);
  if (cached) return cached;

  const entry = readMeta()[trackId];
  if (!entry || !downloadsSupported()) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(entry.url);
    if (!hit) return null;
    const blobUrl = URL.createObjectURL(await hit.blob());
    blobUrls.set(trackId, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
}
