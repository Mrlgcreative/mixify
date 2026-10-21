import assert from 'node:assert/strict';
import test from 'node:test';

import {
  albumFromRss,
  albumFromSearch,
  artistFromSearch,
  trackFromRss,
  trackFromSong,
} from './itunesApi.ts';

/**
 * Fixtures : extraits tels quels des réponses iTunes réelles, capturés pendant
 * le câblage (`/fr/rss/topsongs`, `/fr/rss/topalbums`, `/search?country=fr`).
 * Elles valident le mappage sans requête réseau ni clé.
 */

// Entrée n°1 du Top France : deux `link` (alternate + preview en ms).
const RSS_TRACK = {
  id: { label: 'https://music.apple.com/fr/album/…', attributes: { 'im:id': '6813787783' } },
  'im:name': { label: 'TU N’ES PLUS LÀ' },
  'im:artist': {
    label: 'Doz',
    attributes: { href: 'https://music.apple.com/fr/artist/doz/6772973260?uo=2' },
  },
  'im:image': [
    { label: 'https://is1-ssl.mzstatic.com/…/55x55bb.png', attributes: { height: '55' } },
    { label: 'https://is1-ssl.mzstatic.com/…/170x170bb.png', attributes: { height: '170' } },
  ],
  'im:collection': { 'im:name': { label: 'DEUXIÈME DOSE' } },
  'im:releaseDate': { label: '2026-09-11T05:00:00-07:00' },
  link: [
    { attributes: { rel: 'alternate', type: 'text/html', href: 'https://music.apple.com/fr/album/…' } },
    {
      'im:duration': { label: '30000' },
      attributes: {
        title: 'Extrait',
        rel: 'enclosure',
        type: 'audio/x-m4a',
        href: 'https://audio-ssl.itunes.apple.com/itunes-assets/…/plus.aac.p.m4a',
        'im:assetType': 'preview',
      },
    },
  ],
};

// Résultat réel `/search?term=stromae&entity=song` (morceau complet : 172 s).
const SEARCH_SONG = {
  wrapperType: 'track',
  kind: 'song',
  artistId: 570136838,
  collectionId: 6766440172,
  trackId: 6766440193,
  artistName: 'Tove Lo & Stromae',
  collectionName: 'ESTRUS',
  trackName: 'des fleurs',
  previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/…/plus.aac.p.m4a',
  artworkUrl100: 'https://is1-ssl.mzstatic.com/…/100x100bb.jpg',
  releaseDate: '2026-06-12T07:00:00Z',
  trackTimeMillis: 172545,
  primaryGenreName: 'Pop',
};

test('trackFromRss : titre, artiste (id extrait de l’URL), extrait 30 s', () => {
  const track = trackFromRss(RSS_TRACK);

  assert.equal(track.id, '6813787783');
  assert.equal(track.title, 'TU N’ES PLUS LÀ');
  assert.equal(track.artist.name, 'Doz');
  assert.equal(track.artist.id, '6772973260', 'id artiste lu dans le href');
  assert.equal(track.duration, 30, 'im:duration 30000 ms → 30 s');
  assert.match(track.streamUrl ?? '', /^https:\/\/audio-ssl\.itunes\.apple\.com\//);
  assert.equal(track.album?.title, 'DEUXIÈME DOSE');
  assert.equal(track.album?.coverUrl, 'https://is1-ssl.mzstatic.com/…/170x170bb.png', 'dernier format');
  assert.equal(track.album?.id, '6813787783-album');
});

test('trackFromRss : sans lien preview → pas de flux, durée de repli 30 s', () => {
  const track = trackFromRss({
    id: { attributes: { 'im:id': '42' } },
    'im:name': { label: 'Sans extrait' },
    'im:artist': { label: 'Inconnu' },
  });

  assert.equal(track.streamUrl, undefined);
  assert.equal(track.duration, 30);
  assert.equal(track.album, undefined, 'sans im:collection → pas d’album');
  assert.equal(track.artist.id, 'unknown');
});

test('trackFromRss : entrée minimale ne plante pas', () => {
  const track = trackFromRss({});

  assert.equal(track.title, '');
  assert.equal(track.artist.name, 'Artiste inconnu');
  assert.equal(track.streamUrl, undefined);
});

test('trackFromSong : durée = extrait (30 s), pas la durée complète (172 s)', () => {
  const track = trackFromSong(SEARCH_SONG);

  assert.equal(track.id, '6766440193');
  assert.equal(track.title, 'des fleurs');
  assert.equal(track.duration, 30, 'trackTimeMillis=172545 ignoré : on ne lit que l’extrait');
  assert.equal(track.streamUrl, SEARCH_SONG.previewUrl);
  assert.equal(track.album?.id, '6766440172');
  assert.equal(track.artist.name, 'Tove Lo & Stromae');
});

test('trackFromSong : sans album ni preview → champs absents, pas de crash', () => {
  const track = trackFromSong({ trackId: 7, trackName: 'Solo', artistName: 'Mira' });

  assert.equal(track.album, undefined);
  assert.equal(track.streamUrl, undefined);
  assert.equal(track.duration, 30);
});

test('albumFromRss : année et artiste extraits de l’entrée du classement', () => {
  const album = albumFromRss({
    id: { attributes: { 'im:id': '6772258762' } },
    'im:name': { label: 'Voir la mer' },
    'im:artist': {
      label: 'Grand Corps Malade',
      attributes: { href: 'https://music.apple.com/fr/artist/grand-corps-malade/137076785?uo=2' },
    },
    'im:image': [{ label: 'https://is1-ssl.mzstatic.com/…/170x170bb.png' }],
    'im:releaseDate': { label: '2026-09-18T00:00:00-07:00' },
    link: { attributes: { rel: 'alternate', href: 'https://music.apple.com/fr/album/…' } },
  });

  assert.equal(album.id, '6772258762');
  assert.equal(album.title, 'Voir la mer');
  assert.equal(album.year, 2026);
  assert.equal(album.artist?.name, 'Grand Corps Malade');
  assert.equal(album.artist?.id, '137076785');
  assert.equal(album.coverUrl, 'https://is1-ssl.mzstatic.com/…/170x170bb.png', 'link objet ≠ tableau géré');
});

test('albumFromSearch / artistFromSearch : ids numériques → chaînes, genre conservé', () => {
  const album = albumFromSearch({
    collectionId: 1589216087,
    collectionName: 'Santé - Single',
    artistName: 'Stromae',
    artworkUrl100: 'https://is1-ssl.mzstatic.com/…/100x100bb.jpg',
    releaseDate: '2010-11-08T08:00:00Z',
    trackCount: 1,
  });
  const artist = artistFromSearch({ artistId: 270954369, artistName: 'Stromae', primaryGenreName: 'Pop' });

  assert.equal(album.id, '1589216087');
  assert.equal(album.year, 2010);
  assert.equal(album.trackCount, 1);
  assert.equal(artist.id, '270954369');
  assert.deepEqual(artist.genres, ['Pop'], 'affiché en sous-titre de carte');
});
