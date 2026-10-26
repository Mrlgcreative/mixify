import { ChevronLeft, Play } from 'lucide-react';

import { ErrorState } from '../components/common/ErrorState';
import { Skeleton, SkeletonTrackRow } from '../components/common/Skeleton';
import { TrackList } from '../components/common/TrackList';
import { usePlayer } from '../store/playerStore';
import { useTracks } from '../hooks/useMusicApi';

interface AlbumDetailProps {
  albumId: string;
  onBack: () => void;
}

export function AlbumDetail({ albumId, onBack }: AlbumDetailProps) {
  const { data: allTracks, loading, error, retry } = useTracks();
  const playTrack = usePlayer((s) => s.playTrack);

  if (loading && !allTracks) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end">
          <Skeleton className="h-40 w-40 rounded-panel md:h-52 md:w-52" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-card bg-card">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonTrackRow key={i} />
          ))}
        </div>
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
        <ErrorState title="Album indisponible" error={error} onRetry={retry} />
      </div>
    );
  }

  const tracks = allTracks.filter((track) => track.album?.id === albumId);
  const album = tracks[0]?.album;
  if (!album || tracks.length === 0) {
    return (
      <div className="px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <ErrorState notFound />
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
        <div
          className="flex h-48 w-48 items-center justify-center rounded-panel bg-gradient-to-br from-white/10 to-card text-4xl font-bold text-white/60"
          style={
            album.coverUrl
              ? { backgroundImage: `url(${album.coverUrl})`, backgroundSize: 'cover' }
              : undefined
          }
        >
          {!album.coverUrl && album.title.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Album</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">{album.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {album.artist?.name} {album.year ? `• ${album.year}` : ''} • {tracks.length} titre
            {tracks.length > 1 ? 's' : ''}
          </p>
          <button
            type="button"
            onClick={() => void playTrack(tracks[0], tracks)}
            disabled={tracks.length === 0}
            className="mt-4 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            <Play size={16} fill="currentColor" /> Écouter tout
          </button>
        </div>
      </div>

      <div className="mt-8">
        <TrackList tracks={tracks} showAlbum={false} />
      </div>
    </div>
  );
}
