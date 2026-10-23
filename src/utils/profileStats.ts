import type { HistoryEntry } from '../types/music';

export interface ProfileStats {
  plays: number;
  listeningMs: number;
  uniqueTracks: number;
  uniqueArtists: number;
  last7Days: number;
  topArtists: Array<{ name: string; plays: number }>;
  topGenres: Array<{ name: string; plays: number }>;
}

/** Agrège l'historique d'écoute (200 dernières entrées) pour l'onglet Statistiques. */
export function computeProfileStats(
  history: HistoryEntry[],
  now = Date.now(),
): ProfileStats {
  const trackKeys = new Set<string>();
  const artists = new Map<string, number>();
  const genres = new Map<string, number>();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let listeningMs = 0;
  let last7Days = 0;

  for (const entry of history) {
    listeningMs += entry.durationMs;
    trackKeys.add(entry.track?.id ?? `${entry.title}::${entry.artist}`);
    artists.set(entry.artist, (artists.get(entry.artist) ?? 0) + 1);
    if (entry.genre) genres.set(entry.genre, (genres.get(entry.genre) ?? 0) + 1);
    if (Date.parse(entry.playedAt) >= weekAgo) last7Days += 1;
  }

  const top = (counts: Map<string, number>) =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([name, plays]) => ({ name, plays }));

  return {
    plays: history.length,
    listeningMs,
    uniqueTracks: trackKeys.size,
    uniqueArtists: artists.size,
    last7Days,
    topArtists: top(artists),
    topGenres: top(genres),
  };
}
