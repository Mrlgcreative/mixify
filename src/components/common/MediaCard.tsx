import { Pause, Play } from 'lucide-react';

import { Cover } from './Cover';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  seed: string;
  shape?: 'square' | 'circle';
  onPlay?: () => void;
  onSelect?: () => void;
  playing?: boolean;
}

/** Carte d'album / playlist / artiste (grille ou carrousel). */
export function MediaCard({
  title,
  subtitle,
  seed,
  shape = 'square',
  onPlay,
  onSelect,
  playing = false,
}: MediaCardProps) {
  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative w-[180px] shrink-0 rounded-card bg-card p-3 transition hover:bg-elevated ${
        onSelect ? 'cursor-pointer' : ''
      }`}
    >
      <div className="relative">
        <Cover
          seed={seed}
          title={title}
          rounded={shape === 'circle' ? 'full' : 'card'}
          className={shape === 'circle' ? 'h-[180px] w-[180px]' : 'aspect-square w-full'}
        />
        {onPlay && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            aria-label={`${playing ? 'Pause' : 'Lecture'} : ${title}`}
            className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-black opacity-0 shadow-glow transition group-hover:opacity-100 hover:scale-105"
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
        )}
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-white">{title}</p>
      {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
    </div>
  );
}
