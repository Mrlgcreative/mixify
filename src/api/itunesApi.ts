import type { Album, Artist, HomeFeed, Library, Playlist, SearchResults, Track } from '../types/music';
import type { MusicApi } from './musicApi';

/**
 * Adaptateur iTunes — API publique Apple
 * https://developer.apple.com/documentation/itunes_search_api
 *
 * Choisi pour ses artistes reconnus (France, Afrique, États-Unis, Russie…),
 * sans clé, sans OAuth, sans proxy. Vérifié en réel avant câblage :
 *   - `/search` (song | album | musicArtist) et les flux RSS
 *     `/rss/topsongs|topalbums` renvoient tous `access-control-allow-origin: *` ;
 *   - le CDN `audio-ssl.itunes.apple.com` répond aussi `*` (200, audio/x-m4a) :
 *     MediaElementSource reçoit un flux non teinté, pas de silence ;
 *   - extraits mesurés à 30.000998 s : `duration` = durée réellement jouée ;
 *   - classements par pays validés : /fr /us /ru /ng /za → 15 titres, /ci vide.
 *
 * shortcut: Apple ne fournit que des EXTRAITS de 30 s (aucune API gratuite ne
 * livre les morceaux complets des majors). L'Auto-Mix fonctionne car le fondu
 * s'arme sur `el.duration` réel, mais chaque titre s'arrête à 30 s. Pour des
 * chansons complètes : backend maison (`HttpMusicApi`) avec des fichiers
 * autorisés.
 */

const BASE = 'https://itunes.apple.com';
/** Durée de référence des extraits (mesurée : 30.000998 s). */
const PREVIEW_SECONDS = 30;

/** Classements exposés à la fois sur l'accueil et dans la bibliothèque. */
const CHARTS: ReadonlyArray<{ country: string; title: string; subtitle?: string }> = [
  { country: 'fr', title: 'Top France', subtitle: 'Les plus écoutés en France' },
  { country: 'ng', title: 'Top Afrique', subtitle: 'Classement iTunes Nigeria' },
  { country: 'us', title: 'Top États-Unis' },
  { country: 'ru', title: 'Top Russie' },
];

// ------------------------------------------------------------- shapes iTunes

interface RssLink {
  attributes?: { rel?: string; type?: string; href?: string; 'im:assetType'?: string };
  'im:duration'?: { label?: string };
}

interface RssEntry {
  id?: { attributes?: { 'im:id'?: string } };
  'im:name'?: { label?: string };
  'im:artist'?: { label?: string; attributes?: { href?: string } };
  'im:image'?: Array<{ label?: string }>;
  'im:collection'?: { 'im:name'?: { label?: string } };
  'im:releaseDate'?: { label?: string };
  link?: RssLink | RssLink[];
}

interface RssFeed {
  feed?: { entry?: RssEntry | RssEntry[] };
}

interface SearchSong {
  trackId?: number;
  trackName?: string;
  artistId?: number;
  artistName?: string;
  collectionId?: number;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
}

interface SearchAlbum {
  collectionId?: number;
  collectionName?: string;
  artistId?: number;
  artistName?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackCount?: number;
}

interface SearchArtist {
  artistId?: number;
  artistName?: string;
  primaryGenreName?: string;
}

// ------------------------------------------------------------------- mappers

/** RSS renvoie tantôt `link` en tableau, tantôt en objet (albums). */
function rssLinks(entry: RssEntry): RssLink[] {
  if (Array.isArray(entry.link)) return entry.link;
  return entry.link ? [entry.link] : [];
}

/** Dernière image = plus grand format (55 / 60 / 170 px). */
function rssCover(entry: RssEntry): string | undefined {
  const images = entry['im:image'];
  return images?.[images.length - 1]?.label;
}

/** L'id artiste est dans l'URL `music.apple.com/.../artiste/123`. */
function rssArtistId(entry: RssEntry): string {
  const href = entry['im:artist']?.attributes?.href;
  return href?.match(/\/artist\/[^/]+\/(\d+)/)?.[1] ?? 'unknown';
}

function rssYear(entry: RssEntry): number | undefined {
  const label = entry['im:releaseDate']?.label;
  return label ? Number(label.slice(0, 4)) || undefined : undefined;
}

/** Entrée de classement (RSS) → `Track` avec extrait de 30 s. */
export function trackFromRss(entry: RssEntry): Track {
  const preview = rssLinks(entry).find((link) => link.attributes?.['im:assetType'] === 'preview');
  const durationMs = Number(preview?.['im:duration']?.label);
  const id = entry.id?.attributes?.['im:id'] ?? entry['im:name']?.label ?? '';
  const albumTitle = entry['im:collection']?.['im:name']?.label;

  return {
    id,
    title: entry['im:name']?.label ?? '',
    artist: { id: rssArtistId(entry), name: entry['im:artist']?.label ?? 'Artiste inconnu' },
    album: albumTitle ? { id: `${id}-album`, title: albumTitle, coverUrl: rssCover(entry) } : undefined,
    // `im:duration` est en millisecondes ; absent = repli sur les 30 s réels.
    duration: durationMs > 0 ? Math.round(durationMs / 1000) : PREVIEW_SECONDS,
    streamUrl: preview?.attributes?.href,
  };
}

/** Résultat `entity=song` → `Track` avec extrait de 30 s. */
export function trackFromSong(song: SearchSong): Track {
  return {
    id: song.trackId != null ? String(song.trackId) : (song.trackName ?? ''),
    title: song.trackName ?? '',
    artist: {
      id: song.artistId != null ? String(song.artistId) : 'unknown',
      name: song.artistName ?? 'Artiste inconnu',
    },
    album: song.collectionId != null
      ? {
          id: String(song.collectionId),
          title: song.collectionName ?? '',
          coverUrl: song.artworkUrl100,
        }
      : undefined,
    // `trackTimeMillis` (ex. 172 s) est la durée du morceau COMPLET, non lu ici :
    // afficher 30 s figerait la barre de progression à 12 % à chaque titre.
    duration: PREVIEW_SECONDS,
    streamUrl: song.previewUrl,
  };
}

export function albumFromRss(entry: RssEntry): Album {
  const title = entry['im:name']?.label ?? '';
  return {
    id: entry.id?.attributes?.['im:id'] ?? title,
    title,
    coverUrl: rssCover(entry),
    year: rssYear(entry),
    artist: entry['im:artist']?.label
      ? { id: rssArtistId(entry), name: entry['im:artist'].label }
      : undefined,
  };
}

export function albumFromSearch(album: SearchAlbum): Album {
  return {
    id: album.collectionId != null ? String(album.collectionId) : (album.collectionName ?? ''),
    title: album.collectionName ?? '',
    coverUrl: album.artworkUrl100,
    year: album.releaseDate ? Number(album.releaseDate.slice(0, 4)) || undefined : undefined,
    artist: album.artistName
      ? {
          id: album.artistId != null ? String(album.artistId) : 'unknown',
          name: album.artistName,
        }
      : undefined,
    trackCount: album.trackCount,
  };
}

export function artistFromSearch(artist: SearchArtist): Artist {
  return {
    id: artist.artistId != null ? String(artist.artistId) : (artist.artistName ?? ''),
    name: artist.artistName ?? '',
    genres: artist.primaryGenreName ? [artist.primaryGenreName] : undefined,
  };
}

/** RSS : `entry` est parfois un objet unique (peu d'éléments). */
function rssEntries(feed: RssFeed | undefined): RssEntry[] {
  const entry = feed?.feed?.entry;
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

// --------------------------------------------------------------------- API

export class ItunesMusicApi implements MusicApi {
  /**
   * Cache des classements : l'accueil, la bibliothèque et le détail d'une
   * playlist y reviennent dans la même session (1 requête au lieu de 3).
   */
  private readonly charts = new Map<string, Promise<Track[]>>();

  private async json<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`iTunes ${response.status} sur ${url.slice(BASE.length, 60)}`);
    return (await response.json()) as T;
  }

  /** Classement d'un pays, filtré aux titres qui possèdent un extrait. */
  private chart(country: string): Promise<Track[]> {
    const cached = this.charts.get(country);
    if (cached) return cached;

    const pending = this.json<RssFeed>(`${BASE}/${country}/rss/topsongs/limit=15/json`)
      .then((feed) => rssEntries(feed).map(trackFromRss).filter((track) => track.streamUrl));
    this.charts.set(country, pending);
    // Un échec réseau ne doit pas figer le cache : purge pour retenter plus tard.
    void pending.catch(() => this.charts.delete(country));
    return pending;
  }

  async getHome(): Promise<HomeFeed> {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';

    const [charts, albums] = await Promise.all([
      Promise.all(CHARTS.map((chart) => this.chart(chart.country))),
      this.json<RssFeed>(`${BASE}/fr/rss/topalbums/limit=12/json`)
        .then((feed) => rssEntries(feed).map(albumFromRss)),
    ]);

    return {
      greeting,
      shelves: [
        ...CHARTS.map((chart, index) => ({
          id: `shelf-top-${chart.country}`,
          title: chart.title,
          subtitle: chart.subtitle,
          items: charts[index],
        })),
        { id: 'shelf-albums', title: 'Albums France', items: albums },
      ],
    };
  }

  async search(query: string): Promise<SearchResults> {
    const terms = query.trim();
    if (!terms) return { tracks: [], albums: [], artists: [], playlists: [] };

    // iTunes n'a aucune API de playlists publiques : la catégorie reste vide
    // (l'UI n'affiche que les sections non vides).
    const search = <T>(entity: string, limit: number): Promise<T[]> =>
      this.json<{ results?: T[] }>(
        `${BASE}/search?${new URLSearchParams({ term: terms, entity, limit: String(limit) })}`,
      ).then((payload) => payload.results ?? []);

    const [songs, albums, artists] = await Promise.all([
      search<SearchSong>('song', 30),
      search<SearchAlbum>('album', 20),
      search<SearchArtist>('musicArtist', 20),
    ]);

    return {
      // Un titre sans extrait serait inaudible au milieu de la file d'attente.
      tracks: songs.map(trackFromSong).filter((track) => track.streamUrl),
      albums: albums.map(albumFromSearch),
      artists: artists.map(artistFromSearch),
      playlists: [],
    };
  }

  async getPlaylist(id: string): Promise<Playlist> {
    // Seuls des classements pays existent : id de la forme `chart:fr`.
    const chart = CHARTS.find((candidate) => `chart:${candidate.country}` === id);
    if (!chart) throw new Error(`Playlist inconnue : ${id}`);

    const tracks = await this.chart(chart.country);
    return {
      id,
      title: chart.title,
      description: `Classement iTunes ${chart.country.toUpperCase()} · extraits de 30 s`,
      coverUrl: tracks[0]?.album?.coverUrl,
      owner: 'iTunes',
      tracks,
    };
  }

  async getLibrary(): Promise<Library> {
    // Les classements font office de playlists : ce sont les seules listes
    // publiques disponibles (pas d'API de playlists iTunes, favoris = compte
    // Apple, et l'UI n'a pas de bouton « J'aime ») : `liked` reste vide.
    const playlists = await Promise.all(
      CHARTS.map((chart) => this.getPlaylist(`chart:${chart.country}`)),
    );
    return { playlists, liked: [] };
  }

  /** L'extrait est déjà fourni par `/search` et par le flux RSS. */
  async getStreamUrl(track: Track): Promise<string> {
    if (!track.streamUrl) throw new Error(`iTunes : aucun extrait pour le titre ${track.id}`);
    return track.streamUrl;
  }
}
