export interface PrefetchContext {
  online: boolean;
  cellular: boolean;
  /** Niveau de batterie entre 0 et 1, `null` si inconnu. */
  battery: number | null;
}

/**
 * Téléchargement anticipé : toujours sur Wi-Fi, sur données mobiles seulement
 * si la batterie tient la route.
 */
export function canPrefetch({ online, cellular, battery }: PrefetchContext): boolean {
  if (!online) return false;
  if (!cellular) return true;
  return battery == null || battery > 0.3;
}

export interface CacheEntryLike {
  bytes: number;
  usedAt: number;
}

/** Entrées à supprimer pour repasser sous `limit`, de la plus ancienne à la plus récente. */
export function selectEvictions<T extends CacheEntryLike>(entries: T[], limit: number): T[] {
  let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  if (total <= limit) return [];

  const evicted: T[] = [];
  for (const entry of [...entries].sort((a, b) => a.usedAt - b.usedAt)) {
    if (total <= limit) break;
    evicted.push(entry);
    total -= entry.bytes;
  }
  return evicted;
}
