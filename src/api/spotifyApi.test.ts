import assert from 'node:assert/strict';
import test from 'node:test';

import { toAlbum, toArtist, toPlaylist, toTrack } from './spotifyApi.ts';
import type { Track } from '../types/music';

// Fixtures minimales calquées sur les shapes réels de l'API Spotify.

const PREVIEW_TRACK = {
  id: 'abc123',
  name: 'Été avec toi',
  duration_ms: 215_000,
  preview_url: 'https://p.scdn.co/mp3-preview/xyz',
  explicit: false,
  artists: [{ id: 'art1', name: 'Adèle Castillon' }, { id: 'art2', name: 'feat.' }],
  album: { id: 'alb1', name: 'Déjà vu', images: [{ url: 'https://i.scdn.co/image/cover' }] },
};

test('toTrack : extrait présent → 30 s jouables (pas la durée complète)', () => {
  const track = toTrack(PREVIEW_TRACK);
  assert.equal(track.streamUrl, PREVIEW_TRACK.preview_url);
  // Afficher 215 s figerait la progression à ~14 % (logique iTunes).
  assert.equal(track.duration, 30);
  assert.equal(track.title, 'Été avec toi');
  assert.equal(track.artist.name, 'Adèle Castillon, feat.');
  assert.equal(track.album?.coverUrl, 'https://i.scdn.co/image/cover');
});

test('toTrack : preview_url null (nouvelles apps) → streamUrl absente, durée réelle', () => {
  const track = toTrack({ ...PREVIEW_TRACK, preview_url: null });
  assert.equal(track.streamUrl, undefined);
  // Injouable, mais la durée reste honnête pour l'affichage.
  assert.equal(track.duration, 215);
});

test('toAlbum / toArtist : mappage minimal', () => {
  const album = toAlbum({
    id: 'alb1',
    name: 'Déjà vu',
    images: [{ url: 'https://i.scdn.co/image/cover' }],
    release_date: '2023-06-02',
    total_tracks: 12,
    artists: [{ id: 'art1', name: 'Adèle Castillon' }],
  });
  assert.equal(album.year, 2023);
  assert.equal(album.trackCount, 12);
  assert.equal(album.artist?.name, 'Adèle Castillon');

  const artist = toArtist({
    id: 'art1',
    name: 'Adèle Castillon',
    images: [{ url: 'https://i.scdn.co/image/avatar' }],
    genres: ['french pop'],
  });
  assert.equal(artist.imageUrl, 'https://i.scdn.co/image/avatar');
  assert.deepEqual(artist.genres, ['french pop']);
});

test('toPlaylist : descriptions HTML nettoyées, épisodes et previews manquantes filtrés', () => {
  const playlist = toPlaylist({
    id: 'pl1',
    name: 'Nuit Électronique',
    description: 'Mix de <a href="https://spotify.com">nuit</a>  ',
    images: [],
    owner: { display_name: 'aizen' },
    tracks: {
      items: [
        { track: PREVIEW_TRACK },
        { track: { ...PREVIEW_TRACK, id: 'nopreview', preview_url: null } },
        { track: { id: 'ep1', name: 'Podcast', duration_ms: 3_600_000, type: 'episode' } },
        { track: null },
      ],
    },
  });
  assert.equal(playlist.description, 'Mix de nuit');
  assert.equal(playlist.owner, 'aizen');
  // Les titres sans extrait restent listés (injouables) mais les épisodes non.
  const ids = playlist.tracks.map((track: Track) => track.id);
  assert.deepEqual(ids, ['abc123', 'nopreview']);
});
