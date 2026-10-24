import { ChevronLeft, Loader2, Play } from 'lucide-react';

import { TrackList } from '../components/common/TrackList';
import { usePlayer } from '../store/playerStore';
import { useTracks } from '../hooks/useMusicApi';

interface ArtistDetailProps {
  artistId: string;
  onBack: () => void;
}

export function ArtistDetail({ artistId, onBack }: ArtistDetailProps) {
  const { data: allTracks, loading, error } = useTracks();
  const playTrack = usePlayer((s) => s.playTrack);

  if (loading && !allTracks) {
    return (
      <div className="flex h-40 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} /> Chargement de l'artiste…
      </div>
    );
  }

  if (error || !allTracks) {
    return (
      <div className="px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <p className="text-sm text-danger">Artiste indisponible : {error}</p>
      </div>
    );
  }

  const tracks = allTracks.filter((track) => track.artist?.id === artistId);
  const artist = tracks[0]?.artist;
  if (!artist || tracks.length === 0) {
    return (
      <div className="px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <p className="text-sm text-muted">Artiste introuvable.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
      >
        <ChevronLeft size={16} /> Retour
      </button>

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-white/10 to-card text-4xl font-bold text-white/60">
          {artist.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Artiste</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">{artist.name}</h1>
          <p className="mt-2 text-sm text-muted">{tracks.length} titre{tracks.length > 1 ? 's' : ''}</p>
          <button
            type="button"
            onClick={() => void playTrack(tracks[0], tracks)}
            disabled={tracks.length === 0}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            <Play size={16} fill="currentColor" /> Lire tout
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold text-white">Titres populaires</h2>
        <TrackList tracks={tracks} />
      </div>
    </div>
  );
}
