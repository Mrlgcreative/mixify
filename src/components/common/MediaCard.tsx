import { BadgeCheck, Pause, Play } from 'lucide-react';

import { Cover } from './Cover';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  seed: string;
  shape?: 'square' | 'circle';
  onPlay?: () => void;
  onSelect?: () => void;
  playing?: boolean;
  imageUrl?: string;
  verified?: boolean;
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
  imageUrl,
  verified = false,
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
      className={`group relative shrink-0 transition ${
        shape === 'circle' ? 'w-[148px] sm:w-[164px]' : 'w-[152px] sm:w-[176px] lg:w-[196px]'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      <div className="relative flex justify-center">
        <Cover
          seed={seed}
          title={title}
          rounded={shape === 'circle' ? 'full' : 'card'}
          className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]"
          imageUrl={imageUrl}
        />
        {onPlay && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPlay();
            }}
            aria-label={`${playing ? 'Pause' : 'Lecture'} : ${title}`}
            className="glass-play absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full text-primary-contrast opacity-100 transition hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
          >
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
        )}
      </div>
      <div className={shape === 'circle' ? 'mt-2 text-center' : 'mt-3'}>
        <div className={`flex items-center gap-1 ${shape === 'circle' ? 'justify-center' : ''}`}>
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          {verified && shape === 'circle' && <BadgeCheck size={14} className="shrink-0 text-primary" />}
        </div>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
