import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, Heart, Loader2, Pencil, Play, Plus, Trash2 } from 'lucide-react';

import { api } from '../api/musicApi';
import { listDownloads, onDownloadsChange } from '../audio/offline';
import { MediaCard } from '../components/common/MediaCard';
import { useConfirm } from '../components/common/ConfirmDialog';
import { Skeleton, SkeletonCard } from '../components/common/Skeleton';
import { TrackList } from '../components/common/TrackList';
import { useToast } from '../components/common/Toast';
import { useLibrary, usePlaylist, useTracks } from '../hooks/useMusicApi';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayer } from '../store/playerStore';

interface LibraryViewProps {
  onSelect: (id: string) => void;
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Bibliothèque : favoris, playlists et accès au détail d'une playlist. */
export function LibraryView({ onSelect }: LibraryViewProps) {
  return <LibraryMain onSelect={onSelect} />;
}

/** Titres téléchargés : accessibles même sans réseau (y compris après rechargement). */
function OfflineSection() {
  const [tracks, setTracks] = useState(() => listDownloads().map((entry) => entry.track));
  const playTrack = usePlayer((s) => s.playTrack);

  useEffect(
    () => onDownloadsChange(() => setTracks(listDownloads().map((entry) => entry.track))),
    [],
  );

  if (tracks.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Hors ligne</h2>
          <p className="text-sm text-muted">
            {tracks.length} titre(s) téléchargé(s) · lecture sans connexion
          </p>
        </div>
        <button
          type="button"
          onClick={() => void playTrack(tracks[0], tracks)}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-contrast transition hover:scale-105"
        >
          <Play size={16} fill="currentColor" /> Écouter
        </button>
      </div>
      <div className="mt-4">
        <TrackList tracks={tracks} />
      </div>
    </section>
  );
}

function LibraryMain({ onSelect }: { onSelect: (id: string) => void }) {
  const { data, loading, error } = useLibrary();
  const playTrack = usePlayer((s) => s.playTrack);
  const playlistsChanged = useLibraryStore((s) => s.playlistsChanged);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nom = name.trim();
    if (!nom) return;
    setBusy(true);
    try {
      await api.createPlaylist(nom);
      playlistsChanged();
      setName('');
      setCreating(false);
      toast.success(`Playlist « ${nom} » créée.`);
    } catch (err) {
      toast.error(message(err, 'Création impossible'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <section className="mb-8">
          <Skeleton className="mb-3 h-5 w-20" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
        <section>
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 py-6 md:px-6">
        <OfflineSection />
        <p className="text-sm text-danger">Bibliothèque indisponible : {error}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <OfflineSection />

      <section className="mb-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Titres likés</h2>
            <p className="text-sm text-muted">{data.liked.length} titres</p>
          </div>
          <button
            type="button"
            onClick={() => void playTrack(data.liked[0], data.liked)}
            disabled={data.liked.length === 0}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            <Play size={16} fill="currentColor" /> Écouter
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="flex h-40 items-center justify-center rounded-card bg-gradient-to-br from-primary/30 to-card">
            <Heart size={48} className="text-white/80" fill="currentColor" />
          </div>
          {data.liked.length > 0 ? (
            <TrackList tracks={data.liked} />
          ) : (
            <p className="self-center text-sm text-muted">
              Aucun titre liké pour l’instant : clique sur le cœur d’un morceau.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-bold text-white">Vos playlists</h2>
          <button
            type="button"
            onClick={() => {
              setCreating((value) => !value);
            }}
            className="flex items-center gap-2 rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white transition hover:bg-line"
          >
            <Plus size={16} /> Nouvelle playlist
          </button>
        </div>

        {creating && (
          <form onSubmit={submit} className="mb-4 flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom de la playlist"
              aria-label="Nom de la playlist"
              autoFocus
              className="min-w-0 flex-1 rounded-card border border-line bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none sm:flex-none sm:w-64"
            />
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
            >
              {busy ? 'Création…' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
              }}
              className="text-sm text-muted transition hover:text-white"
            >
              Annuler
            </button>
          </form>
        )}
        {data.playlists.length === 0 ? (
          <p className="text-sm text-muted">Aucune playlist. Crée-en une pour regrouper tes morceaux.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {data.playlists.map((playlistItem) => (
              <MediaCard
                key={playlistItem.id}
                seed={playlistItem.id}
                title={playlistItem.title}
                subtitle={playlistItem.description}
                onSelect={() => onSelect(playlistItem.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function PlaylistDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: playlist, loading, error } = usePlaylist(id);
  const { data: catalog } = useTracks();
  const playTrack = usePlayer((s) => s.playTrack);
  const playlistsChanged = useLibraryStore((s) => s.playlistsChanged);
  const ask = useConfirm();
  const toast = useToast();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, success: string, fallback: string) => {
    setBusy(true);
    try {
      await action();
      playlistsChanged();
      toast.success(success);
      return true;
    } catch (err) {
      toast.error(message(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (loading && !playlist) {
    return (
      <div className="flex h-40 items-center justify-center gap-3 text-muted">
        <Loader2 className="animate-spin" size={18} /> Chargement de la playlist…
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="px-4 py-6 md:px-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
        >
          <ChevronLeft size={16} /> Retour à la bibliothèque
        </button>
        <p className="text-sm text-danger">Playlist indisponible : {error}</p>
      </div>
    );
  }

  const available = (catalog ?? []).filter(
    (track) => !playlist.tracks.some((owned) => owned.id === track.id),
  );

  const rename = async (event: FormEvent) => {
    event.preventDefault();
    const nom = name.trim();
    if (!nom) return;
    if (await run(() => api.renamePlaylist(id, nom), 'Playlist renommée.', 'Renommage impossible')) setRenaming(false);
  };

  const removePlaylist = async () => {
    const ok = await ask({
      title: `Supprimer « ${playlist.title} » ?`,
      description: 'La playlist sera définitivement supprimée. Les morceaux restent dans le catalogue.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    if (await run(() => api.deletePlaylist(id), 'Playlist supprimée.', 'Suppression impossible')) onBack();
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm text-subtle transition hover:text-white"
      >
        <ChevronLeft size={16} /> Retour à la bibliothèque
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {renaming ? (
            <form onSubmit={rename} className="flex flex-wrap items-center gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-label="Nouveau nom de la playlist"
                autoFocus
                className="rounded-card border border-line bg-elevated px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-black disabled:opacity-40"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setRenaming(false)}
                className="text-sm text-muted transition hover:text-white"
              >
                Annuler
              </button>
            </form>
          ) : (
            <h2 className="truncate text-3xl font-extrabold tracking-tight text-white">
              {playlist.title}
            </h2>
          )}
          <p className="text-sm text-muted">{playlist.tracks.length} titres</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void playTrack(playlist.tracks[0], playlist.tracks)}
            disabled={playlist.tracks.length === 0}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            <Play size={16} fill="currentColor" /> Écouter
          </button>
          <button
            type="button"
            onClick={() => {
              setName(playlist.title);
              setRenaming(true);
            }}
            title="Renommer la playlist"
            aria-label="Renommer la playlist"
            className="rounded-full bg-elevated p-2.5 text-muted transition hover:text-white"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => void removePlaylist()}
            disabled={busy}
            title="Supprimer la playlist"
            aria-label="Supprimer la playlist"
            className="rounded-full bg-elevated p-2.5 text-muted transition hover:text-danger disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        {playlist.tracks.length > 0 ? (
          <TrackList
            tracks={playlist.tracks}
            showAlbum
            onRemove={(track) => {
              if (!track.playlistEntryId) return;
              void (async () => {
                const ok = await ask({
                  title: `Retirer « ${track.title} » ?`,
                  description: 'Le morceau quitte cette playlist mais reste dans le catalogue.',
                  confirmLabel: 'Retirer',
                  danger: true,
                });
                if (!ok) return;
                await run(
                  () => api.removeTrackFromPlaylist(track.playlistEntryId as string),
                  'Morceau retiré de la playlist.',
                  'Retrait impossible',
                );
              })();
            }}
          />
        ) : (
          <p className="text-sm text-muted">Playlist vide : ajoute des titres ci-dessous.</p>
        )}
      </div>

      <details className="mt-8 rounded-panel bg-card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Ajouter des titres ({available.length})
        </summary>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Tout le catalogue est déjà dans cette playlist.</p>
        ) : (
          <ul className="scrollbar-thin mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">
            {available.map((track) => (
              <li
                key={track.id}
                className="flex items-center justify-between gap-3 rounded-card px-2 py-1.5 transition hover:bg-elevated"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{track.title}</p>
                  <p className="truncate text-xs text-muted">{track.artist.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void run(
                      () => api.addTrackToPlaylist(id, track.id),
                      'Morceau ajouté à la playlist.',
                      'Ajout impossible',
                    )
                  }
                  disabled={busy}
                  title="Ajouter à la playlist"
                  aria-label={`Ajouter ${track.title} à la playlist`}
                  className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-line hover:text-white disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
