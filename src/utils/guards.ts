import type { Album, Artist, Playlist, Track } from '../types/music';

/** Discriminants de types : l'API renvoie des unions d'objets hétérogènes. */

export function isTrack(item: unknown): item is Track {
  return (
    typeof item === 'object' &&
    item !== null &&
    'artist' in item &&
    'duration' in item &&
    !('tracks' in item)
  );
}

export function isPlaylist(item: unknown): item is Playlist {
  return typeof item === 'object' && item !== null && Array.isArray((item as Playlist).tracks);
}

export function isAlbum(item: unknown): item is Album {
  return (
    typeof item === 'object' &&
    item !== null &&
    'title' in item &&
    !('artist' in item) &&
    !('tracks' in item) &&
    !('name' in item)
  );
}

export function isArtist(item: unknown): item is Artist {
  return (
    typeof item === 'object' &&
    item !== null &&
    'name' in item &&
    !('title' in item) &&
    !('tracks' in item)
  );
}
