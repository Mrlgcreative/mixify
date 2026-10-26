import { useState, type DragEvent, type ReactNode } from 'react';
import {
  BadgeCheck,
  Check,
  Download,
  GripVertical,
  Heart,
  ListPlus,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';

import { Cover } from './Cover';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';
import { downloadTrack, listDownloads, removeDownload } from '../../audio/offline';
import { useLibraryStore } from '../../store/libraryStore';
import { usePlayer } from '../../store/playerStore';
import { estimateAudioBytes, formatBytes } from '../../utils/format';
import { shareTrackToWhatsApp } from '../../utils/share';
import type { Track } from '../../types/music';

interface TrackListProps {
  tracks: Track[];
  /** Durée affichée à droite. */
  showAlbum?: boolean;
  /** Autorise le réordonnancement par glisser-déposer. */
  sortable?: boolean;
  /** Met en évidence la ligne du titre en cours. */
  highlightCurrent?: boolean;
  /** Affiche un bouton de retrait (édition d'une playlist). */
  onRemove?: (track: Track) => void;
  /** Actions propres à l'appelant (espace artiste : éditer, supprimer). */
  renderActions?: (track: Track) => ReactNode;
  /** Affiche le rang (classement) à gauche de la pochette. */
  numbered?: boolean;
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
  onRemove,
  renderActions,
  numbered = false,
}: TrackListProps) {
  const currentTrack = usePlayer((s) => s.currentTrack);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const queue = usePlayer((s) => s.queue);
  const playTrack = usePlayer((s) => s.playTrack);
  const toggle = usePlayer((s) => s.toggle);
  const reorderQueue = usePlayer((s) => s.reorderQueue);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const favorites = useLibraryStore((s) => s.favorites);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const [downloads, setDownloads] = useState(() => listDownloads());
  const [busyId, setBusyId] = useState<string | null>(null);
  const ask = useConfirm();
  const toast = useToast();

  const toggleDownload = async (track: Track) => {
    const isSaved = downloads.some((entry) => entry.track.id === track.id);
    if (isSaved) {
      const ok = await ask({
        title: `Supprimer le téléchargement de « ${track.title} » ?`,
        description: 'Le morceau ne sera plus disponible hors ligne.',
        confirmLabel: 'Supprimer',
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(track.id);
    try {
      if (isSaved) {
        await removeDownload(track.id);
        toast.success('Téléchargement supprimé.');
      } else {
        await downloadTrack(track);
        toast.success(`« ${track.title} » disponible hors ligne.`);
      }
      setDownloads(listDownloads());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Téléchargement impossible.');
    } finally {
      setBusyId(null);
    }
  };

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
    <>
    <ul className="flex flex-col">
      {tracks.map((track, index) => {
        const isCurrent = highlightCurrent && currentTrack?.id === track.id;
        const liked = Boolean(favorites[track.id]);
        const saved = downloads.find((entry) => entry.track.id === track.id);
        const sizeLabel = saved?.bytes ?? estimateAudioBytes(track.duration);
        const sizeText = saved?.bytes
          ? formatBytes(saved.bytes)
          : sizeLabel > 0
            ? `≈${formatBytes(sizeLabel)}`
            : 'Télécharger';
        return (
          <li
            key={track.id}
            draggable={sortable}
            onDragStart={sortable ? onDragStart(index) : undefined}
            onDragOver={sortable ? (event) => event.preventDefault() : undefined}
            onDrop={sortable ? onDrop(index) : undefined}
            className={`group grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-card px-2 py-2 transition hover:bg-elevated sm:gap-3 ${
              sortable ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {numbered && (
                <span
                  className={`w-6 shrink-0 text-right text-sm font-semibold tabular-nums ${
                    index < 3 ? 'text-primary' : 'text-muted'
                  }`}
                >
                  {index + 1}
                </span>
              )}
              {sortable && (
                <GripVertical
                  size={16}
                  className="text-muted opacity-0 transition group-hover:opacity-100"
                />
              )}
              <div className="relative">
                <Cover
                  seed={track.id}
                  title={track.title}
                  className="h-11 w-11"
                  imageUrl={track.album?.coverUrl ?? track.coverUrl}
                />
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
              <p className="flex items-center gap-1 text-xs text-muted">
                <span className="truncate">{track.artist.name}</span>
                {track.artist.verified && (
                  <BadgeCheck
                    size={13}
                    className="shrink-0 text-primary"
                    aria-label="Artiste certifié"
                  />
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted sm:gap-3">
              {showAlbum && <span className="hidden max-w-[180px] truncate md:block">{track.album?.title}</span>}
              {!sortable && (
                <button
                  type="button"
                  onClick={() => void toggleFavorite(track.id)}
                  aria-pressed={liked}
                  title={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-label={
                    liked ? `Retirer ${track.title} des favoris` : `Ajouter ${track.title} aux favoris`
                  }
                  className={
                    liked ? 'text-primary' : 'opacity-0 transition group-hover:opacity-100 hover:text-white'
                  }
                >
                  <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                </button>
              )}
              {!sortable && (
                <button
                  type="button"
                  onClick={() => void toggleDownload(track)}
                  disabled={busyId === track.id}
                  title={
                    saved
                      ? 'Supprimer le téléchargement'
                      : `Télécharger pour l’écoute hors ligne (${formatBytes(sizeLabel)})`
                  }
                  aria-label={
                    saved
                      ? `Supprimer ${track.title} des téléchargements`
                      : `Télécharger ${track.title} (${formatBytes(sizeLabel)}) pour l’écoute hors ligne`
                  }
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums transition ${
                    saved
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-line text-subtle hover:border-primary/60 hover:text-primary'
                  }`}
                >
                  {busyId === track.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : saved ? (
                    <Check size={13} />
                  ) : (
                    <Download size={13} />
                  )}
                  {sizeText}
                </button>
              )}
              {!sortable && (
                <button
                  type="button"
                  onClick={() => void shareTrackToWhatsApp(track)}
                  title="Partager sur WhatsApp"
                  aria-label={`Partager ${track.title} sur WhatsApp`}
                  className="text-[#25D366] transition hover:text-[#3ee27a]"
                >
                  <MessageCircle size={16} />
                </button>
              )}
              <span className="tabular-nums">{formatTime(track.duration)}</span>
              {renderActions?.(track)}
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
                <>
                  <button
                    type="button"
                    onClick={() => addToQueue(track)}
                    title="Ajouter à la file d'attente"
                    aria-label={`Ajouter ${track.title} à la file d'attente`}
                    className="opacity-0 transition group-hover:opacity-100 hover:text-white"
                  >
                    <ListPlus size={15} />
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(track)}
                      title="Retirer de la playlist"
                      aria-label={`Retirer ${track.title} de la playlist`}
                      className="opacity-0 transition group-hover:opacity-100 hover:text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}
