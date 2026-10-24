import { ChevronDown, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';

import { Cover } from '../common/Cover';
import { ProgressBar } from './ProgressBar';
import { usePlayer } from '../../store/playerStore';
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

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  if (!open || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg md:hidden">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(circle at top, hsl(265 70% 45%) 0%, transparent 55%)`,
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Réduire le lecteur"
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/5 hover:text-white"
        >
          <ChevronDown size={24} />
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">En cours de lecture</p>
        <button
          type="button"
          onClick={toggleQueue}
          aria-pressed={queueOpen}
          aria-label="File d'attente"
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            queueOpen ? 'text-primary' : 'text-white/80 hover:bg-white/5 hover:text-white'
          }`}
        >
          <ListMusic size={20} />
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-[320px]">
          <Cover
            seed={currentTrack.id}
            title={currentTrack.title}
            imageUrl={currentTrack.album?.coverUrl}
            className="aspect-square w-full rounded-panel shadow-[0_60px_120px_rgba(76,29,149,0.25)]"
          />
          <div className="mt-8 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold text-white">{currentTrack.title}</h1>
              <p className="mt-1 truncate text-sm text-white/60">{currentTrack.artist.name}</p>
            </div>
          </div>

          <div className="mt-8">
            <ProgressBar value={position} max={duration} onChange={seek} label="Progression" className="w-full" />
            <div className="mt-2 flex justify-between text-xs tabular-nums text-white/50">
              <span>{formatTime(position)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleShuffle}
              aria-pressed={shuffle}
              aria-label="Mode aléatoire"
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                shuffle ? 'text-primary' : 'text-white/60 hover:text-white'
              }`}
            >
              <Shuffle size={18} />
            </button>
            <button
              type="button"
              onClick={() => void previous()}
              aria-label="Titre précédent"
              className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-white/5"
            >
              <SkipBack size={26} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => void toggle()}
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-[0_30px_60px_rgba(255,255,255,0.15)] transition hover:scale-105"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            <button
              type="button"
              onClick={() => void next()}
              aria-label="Titre suivant"
              className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-white/5"
            >
              <SkipForward size={26} fill="currentColor" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              aria-label={`Répétition : ${repeat}`}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                repeat === 'off' ? 'text-white/60 hover:text-white' : 'text-primary'
              }`}
            >
              <RepeatIcon size={18} />
            </button>
          </div>
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-center pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <p className="text-xs text-white/40">Mixify</p>
      </footer>
    </div>
  );
}
