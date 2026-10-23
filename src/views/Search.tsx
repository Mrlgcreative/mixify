import { Loader2 } from 'lucide-react';

import { MediaCard } from '../components/common/MediaCard';
import { TrackList } from '../components/common/TrackList';
import { FollowButton } from '../components/Follow/FollowButton';
import { useSearch } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';

interface SearchViewProps {
  query: string;
}

export function SearchView({ query }: SearchViewProps) {
  const { data, loading } = useSearch(query);
  const playTrack = usePlayer((s) => s.playTrack);

  if (!query.trim()) {
    return (
      <div className="px-4 py-6 md:px-6">
        <h2 className="mb-4 text-xl font-bold text-white">Recherches populaires</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {['Deep Focus', 'Nuit Électronique', 'Lent & Lumineux', 'Auto-Mix'].map((title, index) => (
            <div
              key={title}
              className="flex h-20 items-end rounded-card bg-gradient-to-br from-primary/25 to-elevated p-4"
            >
              <span className="text-lg font-bold text-white">{title}</span>
              <span className="ml-auto text-2xl font-black text-white/25">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} /> Recherche…
      </div>
    );
  }

  const { tracks = [], albums = [], artists = [], playlists = [] } = data ?? {
    tracks: [],
    albums: [],
    artists: [],
    playlists: [],
  };

  return (
    <div className="px-4 py-6 md:px-6">
      {tracks.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-white">Titres</h2>
          <TrackList tracks={tracks} />
        </section>
      )}

      {albums.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-white">Albums</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((album) => (
              <MediaCard
                key={album.id}
                seed={album.id}
                title={album.title}
                subtitle={album.artist?.name}
              />
            ))}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xl font-bold text-white">Artistes</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {artists.map((artist) => (
              <div key={artist.id} className="flex flex-col items-start gap-2">
                <MediaCard
                  seed={artist.id}
                  title={artist.name}
                  subtitle={artist.genres?.join(' · ')}
                  shape="circle"
                />
                <FollowButton artist={artist} />
              </div>
            ))}
          </div>
        </section>
      )}

      {playlists.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold text-white">Playlists</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {playlists.map((playlist) => (
              <MediaCard
                key={playlist.id}
                seed={playlist.id}
                title={playlist.title}
                subtitle={playlist.description}
                onPlay={() => void playTrack(playlist.tracks[0], playlist.tracks)}
              />
            ))}
          </div>
        </section>
      )}

      {tracks.length === 0 &&
        albums.length === 0 &&
        artists.length === 0 &&
        playlists.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Aucun résultat pour « {query} ».</p>
        )}
    </div>
  );
}
