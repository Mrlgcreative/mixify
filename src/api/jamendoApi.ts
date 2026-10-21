import type { Album, Artist, HomeFeed, Library, Playlist, SearchResults, Track } from '../types/music';
import type { MusicApi } from './musicApi';

/**
 * Adaptateur Jamendo — https://developer.jamendo.com/v3.0
 *
 * API de lecture gratuite et sans OAuth : un `client_id` obtenu sur
 * https://devportal.jamendo.com suffit (l'identifiant d'application n'est pas un
 * secret, il est censé circuler dans le navigateur). Catalogue d'environ
 * 500 000 titres sous licence Creative Commons.
 *
 * Points vérifiés avant câblage :
 *   - `api.jamendo.com` renvoie `access-control-allow-origin: *` ;
 *   - le CDN `prod-1.storage.jamendo.com` réfléchit l'origine du navigateur
 *     (`vary: Origin`, `accept-ranges: bytes`) : indispensable, sinon le graphe
 *     Web Audio du moteur entend du silence et le seek fonctionne mal ;
 *   - les champs `audio` / `album_image` pointent sur du mp3 complet
 *     (pas un extrait de 30 s), ce qu'exige un fondu de 12 s.
 */

const BASE = 'https://api.jamendo.com/v3.0';

/** Enveloppe commune à toutes les réponses Jamendo. */
interface JamendoResponse<T> {
  headers: { status: string; code: number; error_message: string; results_count: number };
  results: T[];
}

interface JamendoTrack {
  id: string;
  name: string;
  duration: number | string;
  artist_id?: string;
  artist_name?: string;
  album_id?: string;
  album_name?: string;
  album_image?: string;
  image?: string;
  /** URL de streaming directe (mp3). */
  audio?: string;
}

interface JamendoAlbum {
  id: string;
  name: string;
  releasedate?: string;
  artist_id?: string;
  artist_name?: string;
  image?: string;
}

interface JamendoArtist {
  id: string;
  name: string;
  image?: string;
}

interface JamendoPlaylist {
  id: string;
  name: string;
  creationdate?: string;
  user_id?: string;
  user_name?: string;
  /** Présent uniquement sur `/playlists/tracks`. */
  tracks?: JamendoTrack[];
}

function toArtist(jamendo: JamendoArtist): Artist {
  // Jamendo renvoie `image: ""` quand l'artiste n'a pas d'avatar : on préfère
  // `undefined` pour laisser la pochettes générative prendre le relais.
  return { id: jamendo.id, name: jamendo.name, imageUrl: jamendo.image || undefined };
}

export function toTrack(jamendo: JamendoTrack): Track {
  return {
    id: jamendo.id,
    title: jamendo.name,
    artist: {
      id: jamendo.artist_id ?? 'unknown',
      name: jamendo.artist_name ?? 'Artiste inconnu',
    },
    album: jamendo.album_id
      ? { id: jamendo.album_id, title: jamendo.album_name ?? '', coverUrl: jamendo.album_image }
      : undefined,
    duration: Number(jamendo.duration) || 0,
    streamUrl: jamendo.audio,
    // shortcut: l'API Jamendo ne publie aucun tempo exploitable (seulement un
    // filtre `speed` à 5 paliers, non converti sans risque en BPM). Sans `bpm`,
    // planBeatSync() retombe sur un fondu égal-puissance sans beat-sync : un
    // BPM inventé décalerait les downbeats de ~300 ms en fin de titre. Pour
    // activer le beat-sync sur ce catalogue, estimer le tempo côté client sur
    // l'AnalyserNode et le renseigner ici.
  };
}

export function toAlbum(jamendo: JamendoAlbum): Album {
  return {
    id: jamendo.id,
    title: jamendo.name,
    coverUrl: jamendo.image || undefined,
    year: jamendo.releasedate ? Number(jamendo.releasedate.slice(0, 4)) || undefined : undefined,
    artist: jamendo.artist_id && jamendo.artist_name
      ? { id: jamendo.artist_id, name: jamendo.artist_name }
      : undefined,
  };
}

export function toPlaylist(jamendo: JamendoPlaylist): Playlist {
  const tracks = (jamendo.tracks ?? []).map(toTrack);
  return {
    id: jamendo.id,
    title: jamendo.name,
    // Jamendo n'a pas d'endpoint de couverture playlist : on reprend la pochette
    // du premier titre (Cover.tsx se charge du dégradé de repli sinon).
    coverUrl: tracks[0]?.album?.coverUrl,
    description: jamendo.creationdate ? `Créée le ${jamendo.creationdate}` : undefined,
    owner: jamendo.user_name,
    tracks,
  };
}

export class JamendoMusicApi implements MusicApi {
  // Champ explicite plutôt que parameter property (`private readonly x`) :
  // cette syntaxe n'est pas érased-compatible et casse `node --test`.
  private readonly clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  /** Requête Jamendo commune : enveloppe JSON + contrôle du code de statut. */
  private async get<T>(
    path: string,
    params: Record<string, string | number> = {},
  ): Promise<T[]> {
    const query = new URLSearchParams({ client_id: this.clientId, format: 'json' });
    for (const [key, value] of Object.entries(params)) query.set(key, String(value));

    const response = await fetch(`${BASE}${path}/?${query}`);
    if (!response.ok) throw new Error(`Jamendo ${response.status} sur /${path}`);

    const payload = (await response.json()) as JamendoResponse<T>;
    if (payload.headers.status !== 'success') {
      throw new Error(payload.headers.error_message || `Erreur Jamendo sur /${path}`);
    }
    return payload.results;
  }

  /**
   * Endpoints validés en conditions réelles (certains énoncés de la
   * documentation sont faux, cf. les rejets en commentaire).
   */
  async getHome(): Promise<HomeFeed> {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

    const [trending, picked, fresh, albums, artists] = await Promise.all([
      this.get<JamendoTrack>('/tracks', { order: 'popularity_total_desc', limit: 18 }),
      // `featured=1` seul renvoie 0 ligne : il faut `groupby=artist_id`
      // (un titre par artiste, donc pas de doublons dans le rayon).
      this.get<JamendoTrack>('/tracks', {
        featured: 1,
        groupby: 'artist_id',
        boost: 'popularity_month',
        limit: 18,
      }),
      this.get<JamendoTrack>('/tracks', { order: 'releasedate_desc', limit: 18 }),
      this.get<JamendoAlbum>('/albums', { order: 'popularity_total_desc', limit: 18 }),
      this.get<JamendoArtist>('/artists', { order: 'popularity_month_desc', hasimage: 1, limit: 12 }),
    ]);

    return {
      greeting,
      shelves: [
        {
          id: 'shelf-trending',
          title: 'Tendances Jamendo',
          subtitle: 'Les plus écoutés',
          items: trending.map(toTrack),
        },
        {
          id: 'shelf-picked',
          title: 'Sélection de la rédaction',
          subtitle: 'Un titre par artiste, mis en avant cette semaine',
          items: picked.map(toTrack),
        },
        { id: 'shelf-fresh', title: 'Nouveautés', items: fresh.map(toTrack) },
        { id: 'shelf-albums', title: 'Albums populaires', items: albums.map(toAlbum) },
        { id: 'shelf-artists', title: 'Artistes à suivre', items: artists.map(toArtist) },
      ],
    };
  }

  async search(query: string): Promise<SearchResults> {
    const terms = query.trim();
    if (!terms) return { tracks: [], albums: [], artists: [], playlists: [] };

    // /playlists n'accepte que `namesearch` (sans pistes) ; /playlists/tracks
    // accepte `name` (exact) mais refuse `namesearch`. On prend la seconde
    // pour récupérer les pistes en une seule requête et garder des cartes
    // jouables. `search` plein texte n'existe que sur /tracks.
    const [tracks, albums, artists, playlists] = await Promise.all([
      this.get<JamendoTrack>('/tracks', { search: terms, limit: 30 }),
      this.get<JamendoAlbum>('/albums', { namesearch: terms, limit: 20 }),
      this.get<JamendoArtist>('/artists', { namesearch: terms, limit: 20 }),
      this.get<JamendoPlaylist>('/playlists/tracks', { name: terms, limit: 10 }),
    ]);

    return {
      tracks: tracks.map(toTrack),
      albums: albums.map(toAlbum),
      artists: artists.map(toArtist),
      playlists: playlists.map(toPlaylist),
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    // /playlists/tracks exige un filtre (id | name | user_id | user_name) :
    // une simple liste triée renvoie une erreur de paramètre obligatoire.
    const [playlist] = await this.get<JamendoPlaylist>('/playlists/tracks', { id, limit: 1 });
    if (!playlist) throw new Error(`Playlist inconnue : ${id}`);
    return toPlaylist(playlist);
  }

  async getLibrary(): Promise<Library> {
    // Entités légères (sans pistes) : le détail est chargé à la sélection
    // via getPlaylist(). Les "favoris" Jamendo exigent un flux OAuth2
    // (setuser/favorite) et l'UI n'a pas de bouton "J'aime" : liste vide.
    const playlists = await this.get<JamendoPlaylist>('/playlists', {
      order: 'creationdate_desc',
      limit: 12,
    });
    return { playlists: playlists.map(toPlaylist), liked: [] };
  }

  /** L'URL de streaming est déjà fournie par les endpoints de lecture. */
  async getStreamUrl(track: Track): Promise<string> {
    if (!track.streamUrl) throw new Error(`Jamendo : aucun flux pour le titre ${track.id}`);
    // shortcut: le CDN `prod-N.storage.jamendo.com` renvoie un ACAO périmé
    // (voire absent) à cause de son cache, qui ne tient pas compte de l'Origin :
    // l'audio serait muet via MediaElementSource. Le host racine
    // `storage.jamendo.com` echo `*` de façon fiable (vérifié : 206 + audio/mpeg
    // + ranges). Si Jamendo corrige les hotes prod-N, supprimer ce replace.
    return track.streamUrl.replace(
      /^https:\/\/prod-\d+\.storage\.jamendo\.com/,
      'https://storage.jamendo.com',
    );
  }
}
