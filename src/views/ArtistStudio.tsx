import { useEffect, useState, type FormEvent } from 'react';
import {
  BadgeCheck,
  Check,
  Copy,
  Disc3,
  Globe,
  LayoutDashboard,
  Loader2,
  Music4,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ImageUpload } from '../components/common/ImageUpload';

import { api, BASE_URL } from '../api/musicApi';
import { Cover } from '../components/common/Cover';
import { useConfirm } from '../components/common/ConfirmDialog';
import { ErrorState } from '../components/common/ErrorState';
import { Skeleton, SkeletonTrackRow } from '../components/common/Skeleton';
import { TrackList } from '../components/common/TrackList';
import { useToast } from '../components/common/Toast';
import { useMyArtist, useArtistStats } from '../hooks/useMusicApi';
import type {
  ArtistDashboard,
  ArtistInput,
  ArtistProfile,
  ArtistStats,
  Track,
  TrackInput,
} from '../types/music';
import { Publish } from './Publish';

type Tab = 'overview' | 'tracks' | 'publish' | 'profile';

const TABS: Array<{ id: Tab; label: string; icon: typeof Music4 }> = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'tracks', label: 'Morceaux', icon: Music4 },
  { id: 'publish', label: 'Publier', icon: Upload },
  { id: 'profile', label: 'Profil', icon: UserRound },
];

const inputClass =
  'w-full rounded-card border border-line bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none';

const labelClass = 'flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted';

function formatDuration(ms: number): string {
  if (!ms) return '0 min';
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** Lien cliquable uniquement pour une URL http(s) : évite les schémas dangereux. */
function safeUrl(url?: string): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

/** Espace artiste : tableau de bord, catalogue, publication et profil. */
export function ArtistStudio() {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useMyArtist(revision);
  const stats = useArtistStats(revision);
  const [tab, setTab] = useState<Tab>('overview');
  const refresh = () => setRevision((value) => value + 1);
  const artist = (data as any)?.artist;

  const [verifyForm] = useState({
    instagram_url: '',
    tiktok_url: '',
    youtube_url: '',
    spotify_url: '',
    soundcloud_url: '',
    website_url: '',
    message: '',
  });
  const [verifyStatus] = useState<any[]>([]);
  const [verifyLoading] = useState(false);
  const [verifyError] = useState<string | null>(null);
  const [verifySent] = useState(false);
  void verifyLoading;
  void verifyForm;
  void verifyStatus;
  void verifyError;
  void verifySent;
  void 0;
  void 0;
  void 0;

  // Premier passage sans profil : on ouvre directement le formulaire de création
  useEffect(() => {
    if (!loading && data === null) setTab('profile');
  }, [data, loading, setTab]);

  useEffect(() => {
    if (!artist) return;
    if (artist.verified) return;
    fetch(`${BASE_URL}/api/artists/verify`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('mixify.token')}` },
    })
      .then((r) => r.json())
      .catch(() => {});
  }, [artist?.id, artist?.verified]);

  const _submitVerification = async () => {
    if (!artist) return;
  };
  void _submitVerification;

  if (loading && !data && !error) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </div>
        <div className="overflow-hidden rounded-card bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTrackRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title="Espace artiste indisponible" error={error} onRetry={refresh} />
      </div>
    );
  }

  const empty = (
    <div className="mx-4 mt-6 rounded-panel bg-card p-6 md:mx-6">
      <h2 className="text-xl font-bold text-white">Crée ton profil artiste</h2>
      <p className="mt-1 max-w-lg text-sm text-muted">
        Un profil est nécessaire pour publier des morceaux. Tu pourras ensuite gérer ton
        catalogue, tes informations publiques et tes sorties.
      </p>
      <button
        type="button"
        onClick={() => setTab('profile')}
        className="mt-4 flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition hover:scale-[1.01]"
      >
        <Plus size={16} /> Créer mon profil
      </button>
    </div>
  );

  return (
    <div className="pb-10">
      <nav className="flex gap-1 overflow-x-auto border-b border-line px-4 md:px-6">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                active
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <Icon size={17} className={active ? 'text-primary' : ''} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {tab === 'overview' &&
        (data ? (
          <Overview data={data} stats={stats.data} onTab={setTab} />
        ) : (
          empty
        ))}

      {tab === 'tracks' &&
        (data ? (
          <TracksTab tracks={data.tracks} onRefresh={refresh} onPublish={() => setTab('publish')} />
        ) : (
          empty
        ))}

      {tab === 'publish' && <Publish onPublished={refresh} />}

      {tab === 'profile' && (
        <ProfileForm
          key={data?.artist.id ?? 'nouveau'}
          artist={data?.artist}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------- vue d'ensemble

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-panel bg-card p-4">
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function Overview({
  data,
  stats,
  onTab,
}: {
  data: ArtistDashboard;
  stats: ArtistStats | null;
  onTab: (tab: Tab) => void;
}) {
  const { artist, tracks, totalDurationMs } = data;
  const albums = new Set(tracks.map((track) => track.album?.title).filter(Boolean)).size;
  const website = safeUrl(artist.websiteUrl);

  return (
    <div className="px-4 md:px-6">
      <section className="relative mt-4 overflow-hidden rounded-panel bg-gradient-to-br from-primary/30 via-elevated to-panel">
        {artist.bannerUrl && (
          <div
            className="h-32 bg-cover bg-center opacity-70 md:h-40"
            style={{ backgroundImage: `url(${JSON.stringify(artist.bannerUrl)})` }}
          />
        )}
        <div className="relative z-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
          {artist.imageUrl ? (
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="h-24 w-24 shrink-0 rounded-full border-4 border-panel object-cover"
            />
          ) : (
            <Cover
              seed={artist.id}
              title={artist.name}
              rounded="full"
              className="h-24 w-24 shrink-0 border-4 border-panel text-2xl"
            />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              Profil artiste
            </p>
            <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-white">
              <span className="truncate">{artist.name}</span>
              {artist.verified && (
                <BadgeCheck size={22} className="shrink-0 text-primary" aria-label="Profil vérifié" />
              )}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/70">
              {artist.genres && artist.genres.length > 0 && (
                <span>{artist.genres.join(' · ')}</span>
              )}
              {artist.country && <span>{artist.country}</span>}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-white"
                >
                  <Globe size={13} /> Site
                </a>
              )}
            </div>
            {artist.bio && <p className="mt-2 max-w-2xl text-sm text-white/75">{artist.bio}</p>}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTab('publish')}
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:scale-[1.01]"
            >
              <Upload size={15} /> Publier
            </button>
            <button
              type="button"
              onClick={() => onTab('profile')}
              className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/50"
            >
              <Pencil size={14} /> Modifier
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Morceaux" value={tracks.length} />
        <Stat label="Durée totale" value={formatDuration(totalDurationMs)} />
        <Stat label="Albums" value={albums} />
        <Stat label="Abonnés" value={artist.followers} />
      </section>

      {data.referral?.code && (
        <ReferralCard referral={data.referral} verified={artist.verified} />
      )}

      {stats && <ListeningStats stats={stats} />}

      <section className="mt-8">
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Derniers morceaux</h3>
            <p className="text-xs text-muted">Les plus récents de ton catalogue.</p>
          </div>
          {tracks.length > 0 && (
            <button
              type="button"
              onClick={() => onTab('tracks')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tout voir
            </button>
          )}
        </div>
        {tracks.length > 0 ? (
          <TrackList tracks={tracks.slice(0, 5)} />
        ) : (
          <div className="rounded-panel bg-card p-6 text-sm text-muted">
            Aucun morceau pour l'instant.{' '}
            <button
              type="button"
              onClick={() => onTab('publish')}
              className="font-semibold text-primary hover:underline"
            >
              Publie ton premier titre
            </button>
            .
          </div>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ parrainage

function ReferralCard({
  referral,
  verified,
}: {
  referral: NonNullable<ArtistDashboard['referral']>;
  verified?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const publicOrigin =
    typeof window !== 'undefined' &&
    !/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
      ? window.location.origin
      : 'https://mixify.imasomo.com';
  const link = `${publicOrigin}/?ref=${encodeURIComponent(referral.code ?? '')}`;
  const remaining = Math.max(0, referral.required - referral.count);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : le lien reste sélectionnable */
    }
  };

  return (
    <section className="mt-4 rounded-panel bg-card p-5">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-primary" />
        <h3 className="text-lg font-bold text-white">Parrainage</h3>
        {verified && <BadgeCheck size={16} className="text-primary" aria-label="Certifié" />}
      </div>
      <p className="mt-1 text-sm text-muted">
        {verified
          ? 'Ton compte est certifié. Continue à inviter des personnes sur Mixify.'
          : remaining > 0
            ? `${referral.count} / ${referral.required} filleuls — invite ${remaining} personne${remaining > 1 ? 's' : ''} pour être certifié automatiquement.`
            : `${referral.count} / ${referral.required} filleuls — certification en cours.`}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          aria-label="Lien de parrainage"
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-card border border-line bg-elevated px-3 py-2.5 text-sm text-white focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="flex items-center justify-center gap-2 rounded-card bg-primary px-4 py-2.5 text-sm font-bold text-black transition hover:scale-[1.01]"
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
    </section>
  );
}

// ------------------------------------------------------- statistiques d'écoute

function ListeningStats({ stats }: { stats: ArtistStats }) {
  const max = Math.max(1, ...stats.daily.map((day) => day.plays));
  const top = stats.tracks.filter((track) => track.plays > 0).slice(0, 5);

  return (
    <section className="mt-8">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">Statistiques d'écoute</h3>
        <p className="text-xs text-muted">
          Écoutes du catalogue Mixify, 30 derniers jours.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Écoutes" value={stats.totals.plays} />
        <Stat label="Auditeurs" value={stats.totals.uniqueListeners} />
        <Stat label="Favoris" value={stats.totals.favorites} />
        <Stat label="Temps d'écoute" value={formatDuration(stats.totals.listeningMs)} />
      </div>

      <div className="mt-3 rounded-panel bg-card p-4">
        <div
          role="img"
          aria-label={`Écoutes par jour sur 30 jours, ${stats.totals.plays} au total`}
          className="flex h-20 items-end gap-1"
        >
          {stats.daily.map((day) => (
            <div
              key={day.date}
              title={`${day.date} · ${day.plays} écoute(s)`}
              className="flex-1 rounded-t bg-primary/70"
              style={{
                height: `${Math.round((day.plays / max) * 100)}%`,
                minHeight: day.plays > 0 ? 3 : 1,
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {stats.totals.tracks} morceau(x) · {stats.totals.published} publié(s) ·{" "}
          {stats.totals.playlistAdds} ajout(s) en playlist
        </p>
      </div>

      {top.length > 0 && (
        <ol className="mt-3 divide-y divide-line rounded-panel bg-card">
          {top.map((track, index) => (
            <li key={track.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-4 text-xs font-bold text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-white">{track.title}</span>
              <span className="hidden text-xs text-muted sm:inline">
                {track.uniqueListeners} auditeur(s)
              </span>
              <span className="w-20 text-right font-semibold text-white">
                {track.plays} écoutes
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// -------------------------------------------------------------------- morceaux

function TracksTab({
  tracks,
  onRefresh,
  onPublish,
}: {
  tracks: Track[];
  onRefresh: () => void;
  onPublish: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Track | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const ask = useConfirm();
  const toast = useToast();

  const filtered = tracks.filter((track) =>
    [track.title, track.album?.title, track.genre]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const remove = async (track: Track) => {
    const ok = await ask({
      title: `Supprimer « ${track.title} » ?`,
      description:
        'Le fichier audio sera aussi supprimé du stockage. Les écoutes, favoris et playlists liés à ce morceau seront retirés.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setRemoving(track.id);
    try {
      await api.deleteTrack(track.id);
      onRefresh();
      toast.success(`« ${track.title} » supprimé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="px-4 md:px-6">
      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Mes morceaux</h2>
          <p className="text-sm text-muted">
            {tracks.length} titre{tracks.length > 1 ? 's' : ''} · {formatDuration(
              tracks.reduce((total, track) => total + track.duration * 1000, 0),
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrer…"
            aria-label="Filtrer mes morceaux"
            className="w-40 rounded-full border border-line bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none sm:w-52"
          />
          <button
            type="button"
            onClick={onPublish}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:scale-[1.01]"
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      <div className="mt-4">
        {filtered.length > 0 ? (
          <TrackList
            tracks={filtered}
            showAlbum
            renderActions={(track) => (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(track)}
                  title="Modifier les informations"
                  aria-label={`Modifier ${track.title}`}
                  className="opacity-60 transition hover:text-white hover:opacity-100"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(track)}
                  disabled={removing === track.id}
                  title="Supprimer le morceau"
                  aria-label={`Supprimer ${track.title}`}
                  className="opacity-60 transition hover:text-danger hover:opacity-100 disabled:opacity-30"
                >
                  {removing === track.id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </>
            )}
          />
        ) : (
          <div className="rounded-panel bg-card p-6 text-sm text-muted">
            {tracks.length === 0
              ? 'Ton catalogue est vide.'
              : 'Aucun morceau ne correspond au filtre.'}
          </div>
        )}
      </div>

      {editing && (
        <TrackEditDialog
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function TrackEditDialog({
  track,
  onClose,
  onSaved,
}: {
  track: Track;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [album, setAlbum] = useState(track.album?.title ?? '');
  const [genre, setGenre] = useState(track.genre ?? '');
  const [key, setKey] = useState(track.key ?? '');
  const [bpm, setBpm] = useState(track.bpm?.toString() ?? '');
  const [year, setYear] = useState(track.year?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const ask = useConfirm();
  const toast = useToast();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const ok = await ask({
      title: `Enregistrer les modifications de « ${track.title} » ?`,
      description: 'Les informations du morceau seront mises à jour dans le catalogue.',
      confirmLabel: 'Enregistrer',
    });
    if (!ok) return;
    setBusy(true);
    const input: TrackInput = {
      title: title.trim(),
      album: album.trim() || undefined,
      genre: genre.trim() || undefined,
      key: key.trim() || undefined,
      bpm: bpm ? Number(bpm) : undefined,
      year: year ? Number(year) : undefined,
    };
    try {
      await api.updateTrack(track.id, input);
      onSaved();
      toast.success('Morceau mis à jour.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Modifier ${track.title}`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-panel bg-panel p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Modifier le morceau</h2>
            <p className="text-xs text-muted">Les fichiers audio ne sont pas remplacés.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-1 text-muted transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className={labelClass}>
            Titre
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Album
            <input
              value={album}
              onChange={(event) => setAlbum(event.target.value)}
              placeholder="Optionnel"
              className={inputClass}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              Genre
              <input
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                placeholder="rap, pop…"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Tonalité
              <input
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Am, C#…"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              BPM
              <input
                type="number"
                min={1}
                max={300}
                value={bpm}
                onChange={(event) => setBpm(event.target.value)}
                placeholder="120"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Année
              <input
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(event) => setYear(event.target.value)}
                placeholder="2026"
                className={inputClass}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-white"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-40"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------- profil

function ProfileForm({
  artist,
  onSaved,
}: {
  artist?: ArtistProfile;
  onSaved: () => void;
}) {
  void artist;
  void onSaved;
  const [input, setInput] = useState<ArtistInput>({
    name: artist?.name ?? '',
    bio: artist?.bio ?? '',
    imageUrl: artist?.imageUrl ?? '',
    bannerUrl: artist?.bannerUrl ?? '',
    genres: artist?.genres?.join(', ') ?? '',
    country: artist?.country ?? '',
    websiteUrl: artist?.websiteUrl ?? '',
    socialLinks: artist?.socialLinks ?? '',
  });
  const [busy, setBusy] = useState(false);
  const ask = useConfirm();
  const toast = useToast();
  const [_verifyForm, _setVerifyForm] = useState({
    instagram_url: '',
    tiktok_url: '',
    youtube_url: '',
    spotify_url: '',
    soundcloud_url: '',
    website_url: '',
    message: '',
  });
  const [_verifyStatus, _setVerifyStatus] = useState<any[]>([]);
  const [_verifyLoading, _setVerifyLoading] = useState(false);
  const [_verifyError, _setVerifyError] = useState<string | null>(null);
  const [_verifySent, _setVerifySent] = useState(false);

  const set = (field: keyof ArtistInput) => (
    event: { target: { value: string } },
  ) => setInput((current) => ({ ...current, [field]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.name.trim()) return;
    if (artist) {
      const ok = await ask({
        title: 'Enregistrer les modifications du profil artiste ?',
        description: 'Ces informations sont publiques et apparaissent dans le catalogue.',
        confirmLabel: 'Enregistrer',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (artist) await api.updateArtist(artist.id, input);
      else await api.createArtist(input);
      toast.success(artist ? 'Profil artiste mis à jour.' : 'Profil artiste créé.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 md:px-6">
      <div className="mt-5">
        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {artist ? 'Profil artiste' : 'Créer ton profil artiste'}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-muted">
          {artist
            ? 'Ces informations sont publiques : elles apparaissent dans le catalogue et sur tes morceaux.'
            : 'Choisis le nom sous lequel tu publieras. Tu pourras compléter ta bio et tes liens plus tard.'}
        </p>
      </div>

      <form onSubmit={submit} className="mt-5 flex max-w-2xl flex-col gap-4">
        <label className={labelClass}>
          Nom d'artiste
          <input
            value={input.name}
            onChange={set('name')}
            placeholder="Ton nom de scène"
            required
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Bio
          <textarea
            value={input.bio}
            onChange={set('bio')}
            rows={4}
            placeholder="Quelques mots sur ton univers musical…"
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Genres (séparés par des virgules)
          <input
            value={input.genres}
            onChange={set('genres')}
            placeholder="rap, soul, electro"
            className={inputClass}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Pays
            <input
              value={input.country}
              onChange={set('country')}
              placeholder="France"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Site web
            <input
              value={input.websiteUrl}
              onChange={set('websiteUrl')}
              placeholder="https://…"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-white">Photo de profil</p>
            <ImageUpload
              value={input.imageUrl}
              onChange={(url) => setInput((prev) => ({ ...prev, imageUrl: url }))}
              folder="avatars"
              shape="circle"
              size={96}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-white">Bannière</p>
            <ImageUpload
              value={input.bannerUrl}
              onChange={(url) => setInput((prev) => ({ ...prev, bannerUrl: url }))}
              folder="banners"
              shape="square"
              size={160}
              className="w-full max-w-[320px]"
            />
          </div>
        </div>

        <label className={labelClass}>
          Réseaux / liens (un par ligne)
          <textarea
            value={input.socialLinks}
            onChange={set('socialLinks')}
            rows={3}
            placeholder={'https://instagram.com/…\nhttps://youtube.com/@…'}
            className={inputClass}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !input.name.trim()}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? 'Enregistrement…' : artist ? 'Enregistrer' : 'Créer mon profil'}
          </button>
          {artist && (
            <p className="text-xs text-muted">
              <Disc3 size={13} className="mr-1 inline-block" />
              {artist.followers} abonné{artist.followers > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </form>

      {artist && !artist.verified && (
        <section className="mt-8 rounded-card bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <BadgeCheck size={18} className="text-primary" />
            <h2 className="text-lg font-semibold text-white">Demande de certification</h2>
          </div>
          <p className="mb-4 text-sm text-muted">
            Obtiens le badge certifié en prouvant ton identité artistique via tes liens officiels.
          </p>

          {_verifyStatus.find((r: any) => r.status === 'pending') ? (
            <p className="text-sm text-primary">Ta demande est en attente de validation.</p>
          ) : _verifyStatus.find((r: any) => r.status === 'approved') ? (
            <p className="text-sm text-primary">Certifié ✓</p>
          ) : (
            <form className="grid gap-3 md:grid-cols-2">
              <label className={labelClass}>
                Instagram
                <input value={_verifyForm.instagram_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." className={inputClass} />
              </label>
              <label className={labelClass}>
                TikTok
                <input value={_verifyForm.tiktok_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, tiktok_url: e.target.value }))} placeholder="https://tiktok.com/@..." className={inputClass} />
              </label>
              <label className={labelClass}>
                YouTube
                <input value={_verifyForm.youtube_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, youtube_url: e.target.value }))} placeholder="https://youtube.com/..." className={inputClass} />
              </label>
              <label className={labelClass}>
                Spotify
                <input value={_verifyForm.spotify_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, spotify_url: e.target.value }))} placeholder="https://open.spotify.com/..." className={inputClass} />
              </label>
              <label className={labelClass}>
                SoundCloud
                <input value={_verifyForm.soundcloud_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, soundcloud_url: e.target.value }))} placeholder="https://soundcloud.com/..." className={inputClass} />
              </label>
              <label className={labelClass}>
                Site web
                <input value={_verifyForm.website_url} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, website_url: e.target.value }))} placeholder="https://..." className={inputClass} />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Message
                <textarea value={_verifyForm.message} onChange={(e) => _setVerifyForm((f: any) => ({ ...f, message: e.target.value }))} rows={2} placeholder="Preuve / justification..." className={inputClass} />
              </label>
              {_verifyError && <p className="md:col-span-2 text-sm text-danger">{_verifyError}</p>}
              {_verifySent && <p className="md:col-span-2 text-sm text-primary">Demande envoyée</p>}
              <div className="md:col-span-2">
                <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black">Envoyer la demande</button>
              </div>
            </form>
          )}

          {_verifyStatus.filter((r: any) => r.status === 'rejected').length > 0 && (
            <div className="mt-4 rounded-card bg-white/5 p-4">
              <p className="mb-2 text-sm font-semibold text-white">Demandes rejetées</p>
              {_verifyStatus
                .filter((r: any) => r.status === 'rejected')
                .map((r: any) => (
                  <div key={r.id} className="mb-2 text-xs text-muted">
                    Rejetée {r.admin_note && `— ${r.admin_note}`}
                  </div>
                ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
