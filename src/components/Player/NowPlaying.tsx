import { type ReactNode, useEffect, useState } from 'react';
import { Check, ChevronDown, Download, FileText, Heart, ListMusic, Loader2, Pause, Play, Repeat, Repeat1, Share2, Shuffle, SkipBack, SkipForward, X } from 'lucide-react';

import { Cover } from '../common/Cover';
import { useConfirm } from '../common/ConfirmDialog';
import { useToast } from '../common/Toast';
import { downloadTrack, listDownloads, removeDownload } from '../../audio/offline';
import { usePlayer } from '../../store/playerStore';
import { useFollows } from '../../store/followsStore';
import { useLibraryStore } from '../../store/libraryStore';
import { imageHues, seedHues } from '../../utils/coverColors';
import { estimateAudioBytes, formatBytes, formatTime } from '../../utils/format';
import { shareTrackToWhatsApp } from '../../utils/share';

interface NowPlayingProps {
  open: boolean;
  onClose: () => void;
}

/** Action du bas du lecteur : icône ronde, libellé court, détail optionnel. */
function ActionButton({
  icon,
  label,
  hint,
  accent,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  accent?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1 text-[10px] font-medium transition ${
        active ? 'text-primary' : 'text-white/60 hover:text-white'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ${accent ?? ''}`}
      >
        {icon}
      </span>
      <span className="max-w-full truncate">{label}</span>
      {hint && <span className="text-[9px] leading-none text-white/35">{hint}</span>}
    </button>
  );
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

  const following = useFollows((s) => s.following);
  const toggleFollow = useFollows((s) => s.toggle);
  const favorites = useLibraryStore((s) => s.favorites);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const artistId = currentTrack?.artist?.id;
  const canFollow = Boolean(artistId && artistId !== 'inconnu' && artistId.trim() !== '');
  const isFollow = canFollow ? following.some((f) => f.id === artistId) : false;

  const [palette, setPalette] = useState(() => seedHues(currentTrack?.id ?? 'mixify'));
  const [showLyricsSheet, setShowLyricsSheet] = useState(false);
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ bytes?: number } | null>(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const ask = useConfirm();
  const toast = useToast();

  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  useEffect(() => {
    setLyrics(null);
    setLyricsError(null);
    setLyricsLoading(false);
    setShowLyricsSheet(false);
    const entry = currentTrack
      ? listDownloads().find((item) => item.track.id === currentTrack.id)
      : undefined;
    setSaved(entry ? { bytes: entry.bytes } : null);
  }, [currentTrack?.id]);

  // Fond aux couleurs de la pochette : dégradé génératif immédiat, puis
  // moyenne de l'image réelle quand elle est lisible.
  useEffect(() => {
    if (!currentTrack) return;
    setPalette(seedHues(currentTrack.id));
    const cover = currentTrack.album?.coverUrl ?? currentTrack.coverUrl;
    if (!cover) return;
    let cancelled = false;
    void imageHues(cover).then((hues) => {
      if (!cancelled && hues) setPalette(hues);
    });
    return () => {
      cancelled = true;
    };
  }, [currentTrack?.id, currentTrack?.album?.coverUrl, currentTrack?.coverUrl]);

  if (!open || !currentTrack) return null;

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const liked = Boolean(favorites[currentTrack.id]);

  const fetchLyrics = async () => {
    if (lyrics || lyricsLoading) return;
    setLyricsLoading(true);
    setLyricsError(null);
    try {
      const params = new URLSearchParams({
        artist: currentTrack.artist.name,
        title: currentTrack.title,
      });
      const res = await fetch(`http://localhost:3001/api/lyrics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('mixify.token')}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setLyrics(data.paroles);
    } catch (e) {
      setLyricsError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (downloadBusy) return;
    if (saved) {
      const ok = await ask({
        title: `Supprimer le téléchargement de « ${currentTrack.title} » ?`,
        description: 'Le morceau ne sera plus disponible hors ligne.',
        confirmLabel: 'Supprimer',
        danger: true,
      });
      if (!ok) return;
    }
    setDownloadBusy(true);
    try {
      if (saved) {
        await removeDownload(currentTrack.id);
        setSaved(null);
        toast.success('Téléchargement supprimé.');
      } else {
        await downloadTrack(currentTrack);
        const entry = listDownloads().find((item) => item.track.id === currentTrack.id);
        setSaved(entry ? { bytes: entry.bytes } : {});
        toast.success(`« ${currentTrack.title} » disponible hors ligne.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Téléchargement impossible.');
    } finally {
      setDownloadBusy(false);
    }
  };

  const sizeBytes = saved?.bytes ?? estimateAudioBytes(duration || currentTrack.duration);
  const sizeText = sizeBytes > 0 ? formatBytes(sizeBytes) : '';

  const openLyricsSheet = () => {
    setShowLyricsSheet(true);
    void fetchLyrics();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col md:hidden"
      style={{
        background: `radial-gradient(130% 85% at 50% -10%, hsl(${palette.hue} 72% 45% / 0.55) 0%, hsl(${palette.hue} 60% 28% / 0.3) 45%, transparent 78%), linear-gradient(180deg, hsl(${palette.hue2} 45% 16%) 0%, rgb(var(--bg)) 62%)`,
      }}
    >
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
        <span className="h-10 w-10" aria-hidden="true" />
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        {/* Pochette : presque toute la largeur, réduite sur les écrans courts. */}
        <div className="flex min-h-0 flex-1 items-center justify-center py-3">
          <div className="relative size-[min(82vw,46dvh)] max-w-[420px]">
            <div
              className="absolute -inset-6 rounded-[40px] opacity-70 blur-3xl"
              style={{ backgroundColor: `hsl(${palette.hue} 70% 50%)` }}
            />
            <Cover
              seed={currentTrack.id}
              title={currentTrack.title}
              imageUrl={currentTrack.album?.coverUrl ?? currentTrack.coverUrl}
              className="relative aspect-square w-full rounded-[26px] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
            />
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[22px] font-semibold tracking-tight text-white">
                {currentTrack.title}
              </h1>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="min-w-0 truncate text-[15px] text-white/60">{currentTrack.artist.name}</p>
                {canFollow && (
                  <button
                    type="button"
                    onClick={() => toggleFollow(currentTrack.artist)}
                    aria-pressed={isFollow}
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${
                      isFollow
                        ? 'border-white/25 text-white/60 hover:border-white/40'
                        : 'border-primary/50 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {isFollow ? 'Abonné' : "S'abonner"}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void toggleFavorite(currentTrack.id)}
              aria-pressed={liked}
              aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition ${
                liked ? 'text-primary' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Progression : piste fine, zone de glissement plus large. */}
          <div>
            <div className="relative flex h-8 items-center">
              <div className="absolute inset-x-0 h-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={position}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Position dans le morceau"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <div className="flex justify-between text-[11px] tabular-nums text-white/45">
              <span>{formatTime(position)}</span>
              <span>-{formatTime(Math.max(0, duration - position))}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
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
              className="glass-play flex h-[72px] w-[72px] items-center justify-center rounded-full text-primary-contrast transition hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause size={30} fill="currentColor" />
              ) : (
                <Play size={30} fill="currentColor" className="ml-1" />
              )}
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

          {/* Actions du bas : téléchargement à gauche, le reste groupé à droite. */}
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
            <ActionButton
              onClick={() => void handleDownload()}
              active={Boolean(saved)}
              icon={
                downloadBusy ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : saved ? (
                  <Check size={18} />
                ) : (
                  <Download size={18} />
                )
              }
              label={saved ? 'Hors ligne' : 'Télécharger'}
              hint={sizeText ? `${saved?.bytes ? '' : '≈'}${sizeText}` : undefined}
            />
            <div className="flex items-center gap-3">
              <ActionButton
                onClick={() => void shareTrackToWhatsApp(currentTrack)}
                accent="text-[#25D366]"
                icon={<Share2 size={18} />}
                label="WhatsApp"
              />
              <ActionButton
                onClick={openLyricsSheet}
                icon={<FileText size={18} />}
                label="Paroles"
              />
              <ActionButton
                onClick={toggleQueue}
                active={queueOpen}
                icon={<ListMusic size={18} />}
                label="File"
              />
            </div>
          </div>
        </div>
      </main>

      {showLyricsSheet && (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button
            type="button"
            aria-label="Fermer les paroles"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLyricsSheet(false)}
          />
          <div className="absolute inset-x-0 bottom-0 flex h-[85vh] flex-col rounded-t-[32px] bg-gradient-to-b from-card via-panel to-bg shadow-[0_-60px_160px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-center pt-3">
              <div className="h-1 w-10 rounded-full bg-white/30" />
            </div>
            <header className="flex items-center justify-between px-5 pb-2 pt-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{currentTrack.title}</p>
                <p className="truncate text-xs text-white/60">{currentTrack.artist.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLyricsSheet(false)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                <X size={18} />
              </button>
            </header>
            <main className="flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+36px)] pt-6">
              <div className="mx-auto flex max-w-[360px] flex-col items-center text-center">
                {lyricsLoading && (
                  <div className="py-10 text-sm text-white/50">Chargement des paroles...</div>
                )}
                {lyricsError && (
                  <div className="py-10 text-sm text-white/60">{lyricsError}</div>
                )}
                {lyrics && !lyricsLoading && (
                  <p className="whitespace-pre-wrap text-xl leading-[1.9] tracking-tight text-white/95 sm:text-2xl">
                    {lyrics.replace(/\n\n\*{3}.*$/s, '')}
                  </p>
                )}
                {!lyrics && !lyricsLoading && !lyricsError && (
                  <div className="py-10 text-sm text-white/40">Aucune parole disponible</div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}