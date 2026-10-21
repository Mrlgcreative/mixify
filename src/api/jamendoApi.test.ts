import assert from 'node:assert/strict';
import test from 'node:test';

import { toAlbum, toPlaylist, toTrack } from './jamendoApi.ts';

/**
 * Fixtures : extraits repris tels quels des réponses publiées par la
 * documentation Jamendo (`/playlists/tracks`) et d'un dump de `/tracks`
 * (dataset JamendoMaxCaps, Hugging Face). Elles valident le mappage sans
 * requête réseau ni client_id.
 */

const TRACK_FROM_LISTING = {
  id: '235',
  name: "Natural Sheen - What's your opinion?",
  album_id: '32',
  artist_id: '15',
  duration: '216',
  artist_name: 'Various Artists',
  position: '1',
  image: 'https://usercontent.jamendo.com?type=album&id=32&width=300&trackid=235',
  album_image: 'https://usercontent.jamendo.com?type=album&id=32&width=300&trackid=235',
  audio: 'https://prod-1.storage.jamendo.com/?trackid=235&format=mp31',
  audiodownload_allowed: true,
};

const SINGLE_TRACK = {
  id: '882977',
  name: 'A Singleness of Intention 04',
  duration: 154,
  artist_id: '362132',
  artist_name: 'Matthew VandenBrook',
  album_name: 'A Singleness of Intention',
  album_id: '103795',
  audio: 'https://prod-1.storage.jamendo.com/?trackid=882977&format=mp31',
  musicinfo: { vocalinstrumental: 'instrumental', speed: 'medium' },
};

test('toTrack : duration texte -> secondes, flux et artiste corrects', () => {
  const track = toTrack(TRACK_FROM_LISTING);

  assert.equal(track.id, '235');
  assert.equal(track.title, "Natural Sheen - What's your opinion?");
  assert.equal(track.duration, 216, 'les durées Jamendo arrivent en chaîne');
  assert.equal(track.streamUrl, TRACK_FROM_LISTING.audio, 'streamUrl = champ `audio`');
  assert.equal(track.artist.name, 'Various Artists');
  assert.equal(track.album?.id, '32');
  assert.equal(track.album?.coverUrl, TRACK_FROM_LISTING.album_image);
});

test('toTrack : single sans album ne plante pas', () => {
  const track = toTrack({ id: '1', name: 'Solo', duration: 60, artist_name: 'Mira' });

  assert.equal(track.album, undefined);
  assert.equal(track.streamUrl, undefined);
  assert.equal(track.artist.name, 'Mira');
});

test('toTrack : artiste absent -> libellé de repli', () => {
  const track = toTrack({ id: '9', name: 'Sans auteur', duration: '0' });

  assert.equal(track.artist.name, 'Artiste inconnu');
  assert.equal(track.duration, 0);
});

test('toAlbum : année extraite de la date de sortie', () => {
  const album = toAlbum({
    id: '104336',
    name: 'Season One',
    releasedate: '2011-12-29',
    artist_id: '376782',
    artist_name: 'WE ARE FM',
    image: 'https://usercontent.jamendo.com?type=album&id=104336&width=300',
  });

  assert.equal(album.year, 2011);
  assert.equal(album.artist?.name, 'WE ARE FM');
});

test('toAlbum : date absente ou invalide -> pas d\'année', () => {
  assert.equal(toAlbum({ id: '1', name: 'A' }).year, undefined);
  assert.equal(toAlbum({ id: '1', name: 'A', releasedate: '0000-00-00' }).year, undefined);
});

test('toPlaylist : couverture reprise du premier titre, pistes mappées', () => {
  const playlist = toPlaylist({
    id: '11696',
    name: 'Instrumental',
    creationdate: '2007-03-28',
    user_name: 'EasyTux',
    tracks: [TRACK_FROM_LISTING, SINGLE_TRACK],
  });

  assert.equal(playlist.id, '11696');
  assert.equal(playlist.owner, 'EasyTux');
  assert.equal(playlist.tracks.length, 2);
  assert.equal(playlist.tracks[1].duration, 154);
  assert.equal(
    playlist.coverUrl,
    TRACK_FROM_LISTING.album_image,
    "Jamendo n'expose pas de couverture de playlist",
  );
});

test('toPlaylist : sans pistes, pas de couverture ni de crash', () => {
  const playlist = toPlaylist({ id: '42', name: 'Vide' });

  assert.equal(playlist.tracks.length, 0);
  assert.equal(playlist.coverUrl, undefined);
});
