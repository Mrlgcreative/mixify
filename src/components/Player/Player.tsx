import { useState } from 'react';
import { ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

import { Cover } from '../common/Cover';
import { AutoMixToggle, MixingBadge } from '../AutoMix/AutoMixToggle';
import { ProgressBar } from './ProgressBar';
import { Spectrum } from './Spectrum';
import { NowPlaying } from './NowPlaying';
import { usePlayer } from '../../store/playerStore';
import { formatTime } from '../../utils/format';

interface PlayerProps {
  /** Ouvre la fiche artiste depuis le lecteur plein écran. */
  onOpenArtist: (artistId: string) => void;
}

/** Barre de lecture fixe en bas de l'application. */
export function Player({ onOpenArtist }: PlayerProps) {
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const notice = usePlayer((s) => s.notice);
  const mixing = usePlayer((s) => s.mixing);

  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const previous = usePlayer((s) => s.previous);
  const seek = usePlayer((s) => s.seek);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const cycleRepeat = usePlayer((s) => s.cycleRepeat);
  const toggleQueue = usePlayer((s) => s.toggleQueue);
  const clearNotice = usePlayer((s) => s.clearNotice);

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);

  // Le mini-lecteur n'apparaît qu'une fois un titre lancé.
  if (!currentTrack) return null;

  return (
    <>
      <footer
        className="glass fixed bottom-[calc(72px+env(safe-area-inset-bottom))] left-2 right-2 z-30 flex h-[72px] shrink-0 items-center gap-2 rounded-[22px] px-3 md:relative md:bottom-auto md:left-auto md:right-auto md:z-auto md:mx-2 md:mb-2 md:h-[88px] md:gap-4 md:rounded-[24px] md:px-4"
      >
        {/* Pochette + métadonnées */}
        <button
          type="button"
          onClick={() => setFullPlayerOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left md:w-[28%] md:flex-none"
        >
          <Cover
            seed={currentTrack?.id ?? 'mixify'}
            title={currentTrack?.title ?? 'Mixify'}
            imageUrl={currentTrack?.album?.coverUrl ?? currentTrack?.coverUrl}
            className="h-12 w-12 shrink-0 md:h-14 md:w-14"
          />
          <div className="min-w-0" style={{ textShadow: '0 1px 4px rgb(0 0 0 / 0.6)' }}>
            <p className="truncate text-[13px] font-semibold text-white md:text-sm">
              {currentTrack?.title ?? 'Aucun titre'}
            </p>
            <p className="truncate text-xs text-muted">{currentTrack?.artist.name ?? 'Mixify'}</p>
            {mixing && <MixingBadge />}
          </div>
        </button>

      {/* Transport + progression */}
      <div className="flex flex-[2] flex-col items-center gap-1">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleShuffle}
            aria-pressed={shuffle}
            aria-label="Mode aléatoire"
            className={`hidden transition sm:block ${shuffle ? 'text-primary' : 'text-muted hover:text-white'}`}
          >
            <Shuffle size={16} />
          </button>
          <button
            type="button"
            onClick={() => void previous()}
            aria-label="Titre précédent"
            className="text-muted transition hover:text-white"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => void toggle()}
            aria-label={isPlaying ? 'Pause' : 'Lecture'}
            className="glass-play flex h-10 w-10 items-center justify-center rounded-full text-primary-contrast transition hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => void next()}
            aria-label="Titre suivant"
            className="text-muted transition hover:text-white"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            aria-label={`Répétition : ${repeat}`}
            className={`relative hidden transition sm:block ${repeat === 'off' ? 'text-muted hover:text-white' : 'text-primary'}`}
          >
            <RepeatIcon size={16} />
          </button>
        </div>

        <div className="flex w-full max-w-2xl items-center gap-2">
          <span className="hidden w-10 text-right text-[11px] tabular-nums text-muted sm:block">
            {formatTime(position)}
          </span>
          <ProgressBar value={position} max={duration} onChange={seek} label="Progression" className="flex-1" />
          <span className="hidden w-10 text-[11px] tabular-nums text-muted sm:block">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Contrôles sur mobile */}
      <div className="flex shrink-0 items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={toggleShuffle}
          aria-pressed={shuffle}
          aria-label="Mode aléatoire"
          className={`transition ${shuffle ? 'text-primary' : 'text-muted hover:text-white'}`}
        >
          <Shuffle size={16} />
        </button>
        <button
          type="button"
          onClick={cycleRepeat}
          aria-label={`Répétition : ${repeat}`}
          className={`relative transition ${repeat === 'off' ? 'text-muted hover:text-white' : 'text-primary'}`}
        >
          <RepeatIcon size={16} />
        </button>
        <button
          type="button"
          onClick={toggleQueue}
          aria-pressed={queueOpen}
          aria-label="File d'attente"
          className={`transition ${queueOpen ? 'text-primary' : 'text-muted hover:text-white'}`}
        >
          <ListMusic size={18} />
        </button>
      </div>

      {/* Auto-Mix, analyseur, volume, file d'attente */}
      <div className="hidden flex-1 items-center justify-end gap-4 md:flex">
        <AutoMixToggle />
        <Spectrum />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
            className="text-muted transition hover:text-white"
          >
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <ProgressBar
            value={muted ? 0 : volume}
            max={1}
            onChange={setVolume}
            label="Volume"
            className="w-20"
          />
        </div>
        <button
          type="button"
          onClick={toggleQueue}
          aria-pressed={queueOpen}
          aria-label="File d'attente"
          className={`transition ${queueOpen ? 'text-primary' : 'text-muted hover:text-white'}`}
        >
          <ListMusic size={18} />
        </button>
      </div>

      {notice && (
        <button
          type="button"
          onClick={clearNotice}
          className="absolute -top-10 right-4 rounded-card bg-danger px-4 py-2 text-xs font-medium text-white shadow-card"
        >
          {notice}
        </button>
      )}
      </footer>
      <NowPlaying
        open={fullPlayerOpen}
        onClose={() => setFullPlayerOpen(false)}
        onOpenArtist={onOpenArtist}
      />
    </>
  );
}
