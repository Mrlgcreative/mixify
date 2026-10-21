import type { DragEvent } from 'react';
import { GripVertical, ListPlus, Pause, Play, Trash2 } from 'lucide-react';

import { Cover } from './Cover';
import { usePlayer } from '../../store/playerStore';
import type { Track } from '../../types/music';

interface TrackListProps {
  tracks: Track[];
  /** Durée affichée à droite. */
  showAlbum?: boolean;
  /** Autorise le réordonnancement par glisser-déposer. */
  sortable?: boolean;
  /** Met en évidence la ligne du titre en cours. */
  highlightCurrent?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Liste de titres réutilisée (accueil, recherche, file d'attente). */
export function TrackList({
  tracks,
  showAlbum = false,
  sortable = false,
  highlightCurrent = true,
}: TrackListProps) {
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const queue = usePlayer((s) => s.queue);
  const playTrack = usePlayer((s) => s.playTrack);
  const toggle = usePlayer((s) => s.toggle);
  const reorderQueue = usePlayer((s) => s.reorderQueue);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const addToQueue = usePlayer((s) => s.addToQueue);

  const onDragStart = (index: number) => (event: DragEvent) => {
    event.dataTransfer.setData('text/plain', String(index));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (index: number) => (event: DragEvent) => {
    event.preventDefault();
    const from = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from)) return;
    reorderQueue(from, index);
  };

  return (
    <ul className="flex flex-col">
      {tracks.map((track, index) => {
        const isCurrent = highlightCurrent && currentTrack?.id === track.id;
        return (
          <li
            key={track.id}
            draggable={sortable}
            onDragStart={sortable ? onDragStart(index) : undefined}
            onDragOver={sortable ? (event) => event.preventDefault() : undefined}
            onDrop={sortable ? onDrop(index) : undefined}
            className={`group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-card px-2 py-2 transition hover:bg-elevated ${
              sortable ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {sortable && (
                <GripVertical
                  size={16}
                  className="text-muted opacity-0 transition group-hover:opacity-100"
                />
              )}
              <div className="relative">
                <Cover seed={track.id} title={track.title} className="h-11 w-11" />
                <button
                  type="button"
                  aria-label={isCurrent && isPlaying ? 'Pause' : `Lire ${track.title}`}
                  onClick={() => {
                    if (isCurrent) void toggle();
                    else void playTrack(track, queue.length > 0 ? queue : tracks);
                  }}
                  className={`absolute inset-0 flex items-center justify-center rounded-card bg-black/60 text-white transition ${
                    isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isCurrent && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <p className={`truncate text-sm font-medium ${isCurrent ? 'text-primary' : 'text-white'}`}>
                {track.title}
              </p>
              <p className="truncate text-xs text-muted">{track.artist.name}</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted">
              {showAlbum && <span className="hidden max-w-[180px] truncate md:block">{track.album?.title}</span>}
              <span className="tabular-nums">{formatTime(track.duration)}</span>
              {sortable ? (
                <button
                  type="button"
                  onClick={() => removeFromQueue(index)}
                  disabled={isCurrent}
                  title={isCurrent ? 'Titre en cours' : 'Retirer de la file'}
                  aria-label={`Retirer ${track.title} de la file`}
                  className="opacity-0 transition group-hover:opacity-100 disabled:opacity-30 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => addToQueue(track)}
                  title="Ajouter à la file d'attente"
                  aria-label={`Ajouter ${track.title} à la file d'attente`}
                  className="opacity-0 transition group-hover:opacity-100 hover:text-white"
                >
                  <ListPlus size={15} />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
