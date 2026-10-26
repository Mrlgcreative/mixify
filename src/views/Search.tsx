import { Music, Search as SearchIcon, User, Disc } from 'lucide-react';

import { MediaCard } from '../components/common/MediaCard';
import { ErrorState } from '../components/common/ErrorState';
import { TrackList } from '../components/common/TrackList';
import { FollowButton } from '../components/Follow/FollowButton';
import { Skeleton, SkeletonCard, SkeletonTrackRow } from '../components/common/Skeleton';
import { useSearch } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';

interface SearchViewProps {
  query: string;
  /** Lance une recherche (genres mis en avant). */
  onSearch: (query: string) => void;
}

/** Genres locaux mis en avant : un clic lance la recherche correspondante. */
const GENRES = [
  { title: 'Rumba', color: 'from-amber-400/25 to-orange-700/20' },
  { title: 'Ndombolo', color: 'from-rose-400/25 to-red-700/20' },
  { title: 'Gospel', color: 'from-emerald-400/25 to-teal-700/20' },
  { title: 'Amapiano', color: 'from-sky-400/25 to-blue-700/20' },
  { title: 'Rap', color: 'from-violet-400/25 to-fuchsia-700/20' },
  { title: 'Kolwezi', color: 'from-yellow-300/25 to-amber-700/20' },
];

export function SearchView({ query, onSearch }: SearchViewProps) {
  const { data, loading, error, retry } = useSearch(query);
  const playTrack = usePlayer((s) => s.playTrack);

  if (!query.trim()) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-white">Rechercher</h1>
          <p className="text-sm text-muted">Découvre de nouveaux artistes, albums et titres</p>
        </div>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Genres d’ici</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {GENRES.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => onSearch(item.title)}
                className={`group relative flex h-24 items-end overflow-hidden rounded-card bg-gradient-to-br p-4 text-left transition hover:scale-[1.02] hover:shadow-lg ${item.color}`}
              >
                <span className="text-lg font-bold text-white drop-shadow-lg">{item.title}</span>
                <div className="absolute right-2 top-2 opacity-50 transition group-hover:opacity-80">
                  <Music size={20} className="text-white" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
        <section className="mb-8">
          <Skeleton className="mb-3 h-5 w-16" />
          <div className="overflow-hidden rounded-card bg-card">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonTrackRow key={i} />
            ))}
          </div>
        </section>
        <section className="mb-8">
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-24 w-24 rounded-full sm:h-28 sm:w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="mb-3 h-5 w-16" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 md:px-6">
        <ErrorState title="Recherche indisponible" error={error} onRetry={retry} />
      </div>
    );
  }

  const { tracks = [], albums = [], artists = [], playlists = [] } = data ?? {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
  };

  const totalResults = tracks.length + albums.length + artists.length + playlists.length;

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-bold text-white">
          Résultats pour « <span className="text-primary">{query}</span> »
        </h1>
        <p className="text-sm text-muted">{totalResults} résultat{totalResults > 1 ? 's' : ''}</p>
      </div>

      {tracks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <Music size={18} className="text-primary" />
            Titres
          </h2>
          <div className="overflow-hidden rounded-card bg-card">
            <TrackList tracks={tracks} />
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <User size={18} className="text-primary" />
            Artistes
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {artists.map((artist) => (
              <div key={artist.id} className="flex flex-col items-center gap-2">
                <MediaCard
                  seed={artist.id}
                  title={artist.name}
                  subtitle={artist.genres?.slice(0, 2).join(' · ')}
                  shape="circle"
                  imageUrl={artist.imageUrl}
                  verified={(artist as any).verified}
                />
                <FollowButton artist={artist} />
              </div>
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <Disc size={18} className="text-primary" />
            Albums
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((album) => (
              <MediaCard
                key={album.id}
                seed={album.id}
                title={album.title}
                subtitle={album.artist?.name}
                imageUrl={album.coverUrl}
              />
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <SearchIcon size={18} className="text-primary" />
            Playlists
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {playlists.map((playlist) => (
              <MediaCard
                key={playlist.id}
                seed={playlist.id}
                title={playlist.title}
                subtitle={playlist.description}
                onPlay={() => void playTrack(playlist.tracks?.[0], playlist.tracks)}
              />
            ))}
          </div>
        </section>
      )}

      {totalResults === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <SearchIcon size={48} className="mb-4 text-muted/50" />
          <h3 className="mb-2 text-lg font-semibold text-white">Aucun résultat</h3>
          <p className="text-sm text-muted">Aucun résultat pour « {query} ». Essaie un autre mot-clé.</p>
        </div>
      )}
    </div>
  );
}
