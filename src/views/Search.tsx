import { Loader2, Music, Search as SearchIcon, User, Disc } from 'lucide-react';

import { MediaCard } from '../components/common/MediaCard';
import { TrackList } from '../components/common/TrackList';
import { FollowButton } from '../components/Follow/FollowButton';
import { useSearch } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';

interface SearchViewProps {
  query: string;
}

const TRENDING = [
  { title: 'Pop', color: 'from-pink-500/30 to-purple-600/30' },
  { title: 'Hip-Hop', color: 'from-orange-500/30 to-red-600/30' },
  { title: 'Electro', color: 'from-cyan-500/30 to-blue-600/30' },
  { title: 'Rock', color: 'from-yellow-500/30 to-orange-600/30' },
  { title: 'R&B', color: 'from-violet-500/30 to-fuchsia-600/30' },
  { title: 'Jazz', color: 'from-emerald-500/30 to-teal-600/30' },
];

export function SearchView({ query }: SearchViewProps) {
  const { data, loading } = useSearch(query);
  const playTrack = usePlayer((s) => s.playTrack);

  if (!query.trim()) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-white">Rechercher</h1>
          <p className="text-sm text-muted">Découvre de nouveaux artistes, albums et titres</p>
        </div>

        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-white">Tendances</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {TRENDING.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`group relative flex h-24 items-end overflow-hidden rounded-card bg-gradient-to-br p-4 transition hover:scale-[1.02] hover:shadow-lg ${item.color}`}
              >
                <span className="text-lg font-bold text-white drop-shadow-lg">{item.title}</span>
                <div className="absolute right-2 top-2 opacity-50 transition group-hover:opacity-80">
                  <Music size={20} className="text-white" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Parcourir tout</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="flex h-16 items-center gap-3 rounded-card bg-card p-4 transition hover:bg-elevated">
              <User size={20} className="text-primary" />
              <span className="font-medium text-white">Artistes</span>
            </div>
            <div className="flex h-16 items-center gap-3 rounded-card bg-card p-4 transition hover:bg-elevated">
              <Disc size={20} className="text-primary" />
              <span className="font-medium text-white">Albums</span>
            </div>
            <div className="flex h-16 items-center gap-3 rounded-card bg-card p-4 transition hover:bg-elevated">
              <Music size={20} className="text-primary" />
              <span className="font-medium text-white">Titres</span>
            </div>
            <div className="flex h-16 items-center gap-3 rounded-card bg-card p-4 transition hover:bg-elevated">
              <SearchIcon size={20} className="text-primary" />
              <span className="font-medium text-white">Playlists</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={20} /> 
        <span className="text-sm">Recherche en cours...</span>
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
