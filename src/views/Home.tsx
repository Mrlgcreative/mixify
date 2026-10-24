import { Loader2, Play } from 'lucide-react';

import { Carousel } from '../components/common/Carousel';
import { Cover } from '../components/common/Cover';
import { MediaCard } from '../components/common/MediaCard';
import { useHomeFeed } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';
import { isAlbum, isArtist, isPlaylist, isTrack } from '../utils/guards';
import type { Shelf, Track } from '../types/music';

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

/** Raccourci compact d'une ligne : pochette, titre, lecture au survol. */
function Shortcut({ track, queue }: { track: Track; queue: Track[] }) {
  const playTrack = usePlayer((s) => s.playTrack);
  const currentTrack = usePlayer((s) => s.currentTrack);
  const toggle = usePlayer((s) => s.toggle);

  const active = currentTrack?.id === track.id;

  return (
    <button
      type="button"
      onClick={() => (active ? void toggle() : void playTrack(track, queue))}
      className="group flex items-center gap-2 overflow-hidden rounded-card bg-white/10 pr-2 text-left transition hover:bg-white/20 sm:gap-3 sm:pr-3"
    >
      <Cover seed={track.id} title={track.title} className="h-10 w-10 shrink-0 text-xs sm:h-12 sm:w-12 sm:text-sm" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white sm:text-sm">
        {track.title}
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-black opacity-100 transition sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100">
        <Play size={12} fill="currentColor" className="ml-0.5 sm:h-3.5 sm:w-3.5" />
      </span>
    </button>
  );
}

export function Home() {
  const { data, loading, error } = useHomeFeed();
  const greeting = data?.greeting ?? '';
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
  const hero = heroTracks[0];

  // Raccourcis : les six premiers titres du catalogue publié.
  const catalog = data.shelves.find((shelf) => shelf.id === 'nouveautes')?.items ?? [];
  const shortcuts = catalog.filter(isTrack).slice(0, 6);
  const otherShelves = data.shelves.filter((shelf) => shelf !== firstShelf);

  return (
    <div className="px-4 pb-10 md:px-6">
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
        {greeting}
      </h2>

      {shortcuts.length > 0 && (
        <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((track) => (
            <Shortcut key={track.id} track={track} queue={catalog.filter(isTrack)} />
          ))}
        </section>
      )}

      {/* Bannière du mix du jour */}
      <section className="relative mt-8 overflow-hidden rounded-panel bg-gradient-to-br from-primary/35 via-elevated to-panel p-5 md:p-8">
        <div className="relative flex flex-wrap items-center gap-6">
          <Cover
            seed={hero?.id ?? 'mixify'}
            title={hero?.title ?? 'Mixify'}
            rounded="panel"
            className="hidden h-32 w-32 text-2xl shadow-card md:flex"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              {greeting} · mix du jour
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white md:text-4xl">
              Ton mix du jour est prêt
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Enchaînement automatique, tempo aligné, transitions sans couture.
            </p>
            <button
              type="button"
              onClick={() => hero && void playTrack(hero, heroTracks)}
              disabled={!hero}
              className="mt-5 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
            >
              <Play size={16} fill="currentColor" /> Lancer le mix
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-primary/30 blur-3xl" />
      </section>

      <div className="mt-8">
        {otherShelves.map((shelf) => (
          <ShelfRow key={shelf.id} shelf={shelf} />
        ))}
      </div>
    </div>
  );
}
