import { ChevronLeft, Heart, Loader2, Play } from 'lucide-react';
import { MediaCard } from '../components/common/MediaCard';
import { TrackList } from '../components/common/TrackList';
import { useLibrary, usePlaylist } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';

interface LibraryViewProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function LibraryView({ selectedId, onSelect }: LibraryViewProps) {
  const { data, loading, error } = useLibrary();
  const playTrack = usePlayer((s) => s.playTrack);
  const { data: playlist } = usePlaylist(selectedId);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} /> Chargement de la bibliothèque…
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-6 text-sm text-danger">Bibliothèque indisponible : {error}</p>;
  }

  if (selectedId && playlist) {
    return (
      <div className="px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
        >
          <ChevronLeft size={16} /> Retour à la bibliothèque
        </button>
        <h2 className="mb-1 text-3xl font-extrabold tracking-tight text-white">{playlist.title}</h2>
        <p className="mb-6 text-sm text-muted">
          {playlist.description} · {playlist.tracks.length} titres
        </p>
        <TrackList tracks={playlist.tracks} showAlbum />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <section className="mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Titres likés</h2>
            <p className="text-sm text-muted">{data.liked.length} titres</p>
          </div>
          <button
            type="button"
            onClick={() => void playTrack(data.liked[0], data.liked)}
            disabled={data.liked.length === 0}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            <Play size={16} fill="currentColor" /> Écouter
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex h-40 items-center justify-center rounded-card bg-gradient-to-br from-primary/30 to-card">
            <Heart size={48} className="text-white/80" fill="currentColor" />
          </div>
          <TrackList tracks={data.liked} />
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-white">Vos playlists</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {data.playlists.map((playlistItem) => (
            <MediaCard
              key={playlistItem.id}
              seed={playlistItem.id}
              title={playlistItem.title}
              subtitle={playlistItem.description}
              onSelect={() => onSelect(playlistItem.id)}
              // Une playlist distante peut être renvoyée sans ses pistes.
              onPlay={
                playlistItem.tracks.length > 0
                  ? () => void playTrack(playlistItem.tracks[0], playlistItem.tracks)
                  : undefined
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
