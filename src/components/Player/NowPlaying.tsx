import { ChevronDown, Heart, ListMusic, MoreHorizontal, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';

import { Cover } from '../common/Cover';
import { usePlayer } from '../../store/playerStore';
import { useFollows } from '../../store/followsStore';
import { formatTime } from '../../utils/format';

interface NowPlayingProps {
  open: boolean;
  onClose: () => void;
}

export function NowPlaying({ open, onClose }: NowPlayingProps) {
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const queueOpen = usePlayer((s) => s.queueOpen);

  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleQueue = usePlayer((s) => s.toggleQueue);

  const isFollowing = useFollows((s) => s.isFollowing);
  const toggleFollow = useFollows((s) => s.toggle);
  const artistId = currentTrack?.artist.id;
  const following = artistId ? isFollowing(artistId) : false;

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  if (!open || !currentTrack) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#050510] md:hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at top, rgba(168,85,247,0.35) 0%, rgba(59,7,100,0.25) 35%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-purple-500/10 to-transparent" />

      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+10px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Réduire le lecteur"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <ChevronDown size={26} />
        </button>
        <div className="flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Lecture</p>
          <p className="text-xs text-white/70">Mixify</p>
        </div>
        <button
          type="button"
          aria-label="Plus d'options"
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <MoreHorizontal size={22} />
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-between px-6 pb-8 pt-6">
        <div className="flex w-full flex-1 items-center justify-center">
          <div className="relative w-full max-w-[340px]">
            <div className="absolute -inset-6 rounded-[40px] bg-purple-500/20 blur-3xl" />
            <Cover
              seed={currentTrack.id}
              title={currentTrack.title}
              imageUrl={currentTrack.album?.coverUrl}
              className="relative aspect-square w-full rounded-[28px] shadow-[0_80px_160px_rgba(139,92,246,0.35)]"
            />
          </div>
        </div>

        <div className="w-full max-w-[340px] space-y-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white">{currentTrack.title}</h1>
              <p className="mt-1 truncate text-base text-white/60">{currentTrack.artist.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => artistId && toggleFollow(artistId)}
                aria-pressed={following}
                aria-label={following ? `Ne plus suivre ${currentTrack.artist.name}` : `Suivre ${currentTrack.artist.name}`}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  following ? 'bg-primary/20 text-primary' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Heart size={20} fill={following ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={toggleQueue}
                aria-pressed={queueOpen}
                aria-label="File d'attente"
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  queueOpen ? 'bg-white/10 text-primary' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ListMusic size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="group relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={position}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="flex justify-between text-xs tabular-nums text-white/40">
              <span>{formatTime(position)}</span>
              <span>-{formatTime(Math.max(0, duration - position))}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Mode aléatoire"
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                shuffle ? 'bg-white/10 text-primary' : 'text-white/50 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Shuffle size={20} />
            </button>
            <button
              type="button"
              onClick={() => void previous()}
              aria-label="Titre précédent"
              className="flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:bg-white/5"
            >
              <SkipBack size={30} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => void toggle()}
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-[0_40px_80px_rgba(255,255,255,0.18)] transition hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
            </button>
            <button
              type="button"
              onClick={() => void next()}
              aria-label="Titre suivant"
              className="flex h-14 w-14 items-center justify-center rounded-full text-white transition hover:bg-white/5"
            >
              <SkipForward size={30} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Répétition : ${repeat}`}
              className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
                repeat === 'off' ? 'text-white/50 hover:bg-white/5 hover:text-white' : 'bg-white/10 text-primary'
              }`}
            >
              <RepeatIcon size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
