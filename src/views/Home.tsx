import { Loader2, Play } from 'lucide-react';

import { Carousel } from '../components/common/Carousel';
import { MediaCard } from '../components/common/MediaCard';
import { useHomeFeed } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';
import { isAlbum, isArtist, isPlaylist, isTrack } from '../utils/guards';
import type { Shelf } from '../types/music';

interface ShelfProps {
  shelf: Shelf;
}

/** Un rayon de la page d'accueil, adapté au type de contenu. */
function ShelfRow({ shelf }: ShelfProps) {
  const playTrack = usePlayer((s) => s.playTrack);
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const toggle = usePlayer((s) => s.toggle);

  const tracks = shelf.items.filter(isTrack);
  const context = tracks.length > 0 ? tracks : undefined;

  return (
    <Carousel title={shelf.title} subtitle={shelf.subtitle}>
      {shelf.items.map((item) => {
        if (isTrack(item)) {
          const active = currentTrack?.id === item.id;
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.title}
              subtitle={item.artist.name}
              playing={active && isPlaying}
              onPlay={() => (active ? void toggle() : void playTrack(item, context))}
            />
          );
        }
        if (isPlaylist(item)) {
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.title}
              subtitle={item.description ?? `${item.tracks.length} titres`}
              onPlay={() => void playTrack(item.tracks[0], item.tracks)}
            />
          );
        }
        if (isAlbum(item)) {
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.title}
              subtitle={`${item.year ?? ''} ${item.artist?.name ?? ''}`.trim()}
            />
          );
        }
        if (isArtist(item)) {
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.name}
              subtitle={item.genres?.join(' · ')}
              shape="circle"
            />
          );
        }
        return null;
      })}
    </Carousel>
  );
}

export function Home() {
  const { data, loading, error } = useHomeFeed();
  const playTrack = usePlayer((s) => s.playTrack);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} /> Chargement…
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-6 text-sm text-danger">Impossible de charger l'accueil : {error}</p>;
  }

  const firstShelf = data.shelves[0];
  const heroTracks = firstShelf?.items.filter(isTrack) ?? [];

  return (
    <div className="px-4 pb-10 md:px-6">
      {/* Bannière */}
      <section className="relative mb-8 overflow-hidden rounded-panel bg-gradient-to-br from-primary/35 via-elevated to-panel p-8">
        <div className="relative z-10">
          <p className="text-sm font-medium text-white/80">{data.greeting}</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Ton mix du jour est prêt
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/70">
            Enchaînement automatique, tempo aligné, transitions sans couture.
          </p>
          <button
            type="button"
            onClick={() => heroTracks[0] && void playTrack(heroTracks[0], heroTracks)}
            className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:scale-105"
          >
            <Play size={16} fill="currentColor" /> Lancer le mix
          </button>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
      </section>

      {data.shelves.map((shelf) => (
        <ShelfRow key={shelf.id} shelf={shelf} />
      ))}
    </div>
  );
}
