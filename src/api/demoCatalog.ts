import type { Album, Artist, Playlist, Track } from '../types/music';

/** Catalogue de démonstration (données locales, remplaçables par l'API). */

const artists: Artist[] = [
  { id: 'ar-1', name: 'Neon Harbour', genres: ['Electronic', 'Indie'] },
  { id: 'ar-2', name: 'Lumen', genres: ['Ambient', 'Post-rock'] },
  { id: 'ar-3', name: 'Kairo Bloom', genres: ['Pop', 'Synth'] },
  { id: 'ar-4', name: 'Static Palms', genres: ['House', 'Disco'] },
  { id: 'ar-5', name: 'Mira Sol', genres: ['R&B', 'Soul'] },
  { id: 'ar-6', name: 'Aurora Fields', genres: ['Cinematic', 'Ambient'] },
];

const albums: Album[] = [
  { id: 'al-1', title: 'Night Signals', year: 2024, artist: artists[0] },
  { id: 'al-2', title: 'Slow Light', year: 2023, artist: artists[1] },
  { id: 'al-3', title: 'Glass Hours', year: 2025, artist: artists[2] },
  { id: 'al-4', title: 'Parallel Sunsets', year: 2024, artist: artists[3] },
  { id: 'al-5', title: 'Velvet Transit', year: 2025, artist: artists[4] },
  { id: 'al-6', title: 'Long Exposure', year: 2022, artist: artists[5] },
];

interface TrackSeed {
  id: string;
  title: string;
  artistIndex: number;
  albumIndex: number;
  bpm: number;
  key: string;
  duration: number;
}

const seeds: TrackSeed[] = [
  { id: 'tr-1', title: 'Midnight Transmitter', artistIndex: 0, albumIndex: 0, bpm: 122, key: 'A min', duration: 48 },
  { id: 'tr-2', title: 'Neon Parallax', artistIndex: 0, albumIndex: 0, bpm: 118, key: 'C min', duration: 48 },
  { id: 'tr-3', title: 'Slow Light', artistIndex: 1, albumIndex: 1, bpm: 90, key: 'F maj', duration: 48 },
  { id: 'tr-4', title: 'Halo Drift', artistIndex: 1, albumIndex: 1, bpm: 84, key: 'D maj', duration: 48 },
  { id: 'tr-5', title: 'Glass Hours', artistIndex: 2, albumIndex: 2, bpm: 128, key: 'E min', duration: 48 },
  { id: 'tr-6', title: 'Paper Satellites', artistIndex: 2, albumIndex: 2, bpm: 110, key: 'G maj', duration: 48 },
  { id: 'tr-7', title: 'Parallel Sunsets', artistIndex: 3, albumIndex: 3, bpm: 124, key: 'A maj', duration: 48 },
  { id: 'tr-8', title: 'Long Way Down', artistIndex: 3, albumIndex: 3, bpm: 126, key: 'D min', duration: 48 },
  { id: 'tr-9', title: 'Velvet Transit', artistIndex: 4, albumIndex: 4, bpm: 96, key: 'F min', duration: 48 },
  { id: 'tr-10', title: 'Stay Awhile', artistIndex: 4, albumIndex: 4, bpm: 88, key: 'C maj', duration: 48 },
  { id: 'tr-11', title: 'Long Exposure', artistIndex: 5, albumIndex: 5, bpm: 72, key: 'B min', duration: 48 },
  { id: 'tr-12', title: 'Northern Static', artistIndex: 5, albumIndex: 5, bpm: 78, key: 'E maj', duration: 48 },
];

export const demoTracks: Track[] = seeds.map((seed) => ({
  id: seed.id,
  title: seed.title,
  artist: artists[seed.artistIndex],
  album: albums[seed.albumIndex],
  duration: seed.duration,
  bpm: seed.bpm,
  key: seed.key,
}));

export const demoAlbums: Album[] = albums;

export const demoArtists: Artist[] = artists;

export const demoPlaylists: Playlist[] = [
  {
    id: 'pl-1',
    title: 'Auto-Mix: Deep Focus',
    description: 'BPM alignés, transitions sans couture.',
    owner: 'Mixify',
    tracks: [demoTracks[0], demoTracks[6], demoTracks[4], demoTracks[10]],
  },
  {
    id: 'pl-2',
    title: 'Nuit Électronique',
    description: 'Pour coder à 3h du matin.',
    owner: 'Mixify',
    tracks: [demoTracks[1], demoTracks[7], demoTracks[3]],
  },
  {
    id: 'pl-3',
    title: 'Lent & Lumineux',
    description: 'Ambient pour se poser.',
    owner: 'Mixify',
    tracks: [demoTracks[2], demoTracks[10], demoTracks[8], demoTracks[3]],
  },
];

export const demoLikedTracks: Track[] = [
  demoTracks[4],
  demoTracks[0],
  demoTracks[8],
  demoTracks[5],
  demoTracks[11],
];
