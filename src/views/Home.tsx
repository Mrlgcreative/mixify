import { Play } from 'lucide-react';

import { Carousel } from '../components/common/Carousel';
import { Cover } from '../components/common/Cover';
import { MediaCard } from '../components/common/MediaCard';
import { SkeletonCard } from '../components/common/Skeleton';
import { useHistory, useHomeFeed } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { isAlbum, isArtist, isPlaylist, isTrack } from '../utils/guards';
import type { Shelf, Track } from '../types/music';

interface ShelfProps {
  shelf: Shelf;
}

/** Un rayon de la page d'accueil, adapté au type de contenu. */
function ShelfRow({ shelf, onOpenAlbum, onOpenArtist }: ShelfProps & HomeProps) {
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
              onSelect={onOpenAlbum ? () => onOpenAlbum(item.id) : undefined}
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
              onSelect={onOpenArtist ? () => onOpenArtist(item.id) : undefined}
              imageUrl={item.imageUrl}
              verified={(item as any).verified}
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
      className="group flex items-center gap-2 overflow-hidden rounded-card bg-white/[0.06] pr-2 text-left transition hover:bg-white/[0.12] sm:gap-3 sm:pr-3"
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

interface HomeProps {
  onOpenAlbum?: (id: string) => void;
  onOpenArtist?: (id: string) => void;
}

export function Home({ onOpenAlbum, onOpenArtist }: HomeProps = {}) {
  const { data, loading, error } = useHomeFeed();
  const user = useAuthStore((s) => s.user);
  const history = useHistory(user ? 0 : -1);
  const greeting = data?.greeting ?? '';
  const playTrack = usePlayer((s) => s.playTrack);

  if (loading) {
    return (
      <div className="px-4 pb-10 md:px-6">
        <div className="mt-2 h-8 w-48 animate-pulse rounded-md bg-white/10 md:h-9" />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 rounded-card bg-white/5 pr-2 sm:gap-3 sm:pr-3">
              <div className="h-10 w-10 animate-pulse rounded-l-card bg-white/10 sm:h-12 sm:w-12" />
              <div className="h-4 flex-1 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
        <div className="mt-8 h-40 animate-pulse rounded-panel bg-white/5 md:h-48" />
        <div className="mt-8 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-3 h-6 w-40 animate-pulse rounded bg-white/10" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, j) => (
                  <SkeletonCard key={j} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="p-6 text-sm text-danger">Impossible de charger l'accueil : {error}</p>;
  }

  const localShelf = data.shelves.find((shelf) => shelf.id === 'kolwezi');
  const heroTracks = data.shelves.flatMap((shelf) => shelf.items.filter(isTrack));
  const localHero = localShelf?.items.filter(isTrack)[0];
  const hero = localHero ?? heroTracks[0];

  // Raccourcis : les six premiers titres du catalogue publié.
  const catalog = data.shelves.find((shelf) => shelf.id === 'nouveautes')?.items ?? [];
  const catalogTracks = catalog.filter(isTrack);
  const historyCounts = new Map<string, number>();
  for (const entry of history.data ?? []) {
    const key = entry.track?.id ?? entry.title;
    if (!key) continue;
    historyCounts.set(key, (historyCounts.get(key) ?? 0) + 1);
  }
  const shortcuts = [...catalogTracks]
    .sort((a, b) => (historyCounts.get(b.id) ?? 0) - (historyCounts.get(a.id) ?? 0))
    .slice(0, 6);
  const otherShelves = data.shelves;

  return (
    <div className="px-4 pb-10 md:px-6">
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
        {greeting}
        {greeting && user?.name ? `, ${user.name.split(' ')[0]}` : ''}
      </h2>

      {shortcuts.length > 0 && (
        <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((track) => (
            <Shortcut key={track.id} track={track} queue={catalog.filter(isTrack)} />
          ))}
        </section>
      )}

      {/* À la une : grande pochette, l'interface s'efface devant le titre. */}
      <section className="relative mt-8 overflow-hidden rounded-panel bg-gradient-to-br from-primary/20 via-card to-panel p-5 md:p-8">
        <div className="relative flex flex-wrap items-end gap-6">
          <Cover
            seed={hero?.id ?? 'mixify'}
            title={hero?.title ?? 'Mixify'}
            imageUrl={hero?.album?.coverUrl}
            rounded="panel"
            className="h-40 w-40 text-3xl shadow-card md:h-52 md:w-52"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {localHero ? 'Scène de Kolwezi' : 'À la une'}
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              {hero?.title ?? 'Ton mix du jour est prêt'}
            </h2>
            <p className="mt-2 max-w-md text-sm text-subtle">
              {hero
                ? `${hero.artist.name}${hero.album?.title ? ` — ${hero.album.title}` : ''}`
                : 'Les artistes de Kolwezi et du Congo, réunis sur Mixify.'}
            </p>
            <p className="mt-1 max-w-md text-xs text-muted">
              Enchaînement automatique, tempo aligné, transitions sans couture.
            </p>
            <button
              type="button"
              onClick={() => hero && void playTrack(hero, heroTracks)}
              disabled={!hero}
              className="mt-5 flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-contrast transition enabled:hover:scale-[1.02] disabled:opacity-40"
            >
              <Play size={16} fill="currentColor" /> Écouter le mix
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      </section>

      <div className="mt-8">
        {otherShelves.map((shelf) => (
          <ShelfRow key={shelf.id} shelf={shelf} onOpenAlbum={onOpenAlbum} onOpenArtist={onOpenArtist} />
        ))}
      </div>
    </div>
  );
}
