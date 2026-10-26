import { useState, type FormEvent, type ReactNode } from 'react';
import {
  BadgeCheck,
  Ban,
  Check,
  LayoutDashboard,
  Loader2,
  Mic2,
  Music4,
  ScrollText,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

import {
  adminApi,
  type AdminArtist,
  type AdminTrack,
  type AdminUser,
  type Page,
  type VerificationRequest,
} from '../api/adminApi';
import { useConfirm } from '../components/common/ConfirmDialog';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../components/common/Toast';
import { useAsync, type AsyncState } from '../hooks/useMusicApi';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types/auth';

type Tab = 'overview' | 'verifications' | 'users' | 'artists' | 'tracks' | 'logs';

const TABS: Array<{ id: Tab; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'verifications', label: 'Vérifications', icon: BadgeCheck },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'artists', label: 'Artistes', icon: Mic2 },
  { id: 'tracks', label: 'Morceaux', icon: Music4 },
  { id: 'logs', label: 'Journal', icon: ScrollText },
];

const ROLE_LABELS: Record<Role, string> = {
  utilisateur: 'Utilisateur',
  artiste: 'Artiste',
  developper: 'Développeur',
  admin: 'Admin',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  banned: 'Banni',
};

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Chargement d'une ressource admin avec rechargement manuel après une action. */
function useResource<T>(load: () => Promise<T>, deps: unknown[]) {
  const [revision, setRevision] = useState(0);
  const state = useAsync(load, [...deps, revision]);
  return { ...state, refresh: () => setRevision((value) => value + 1) };
}

const buttonClass =
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-40';
const primaryButton = `${buttonClass} bg-primary text-primary-contrast enabled:hover:brightness-110`;
const ghostButton = `${buttonClass} border border-line text-white enabled:hover:bg-elevated`;
const dangerButton = `${buttonClass} border border-danger/40 text-danger enabled:hover:bg-danger/10`;

/** Interface d'administration : pilotage du catalogue et des comptes. */
export function Admin() {
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<Tab>('overview');

  if (user?.role !== 'admin') {
    return <p className="px-4 py-6 text-sm text-danger">Accès réservé aux administrateurs.</p>;
  }

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

      {tab === 'overview' && <OverviewTab />}
      {tab === 'verifications' && <VerificationsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'artists' && <ArtistsTab />}
      {tab === 'tracks' && <TracksTab />}
      {tab === 'logs' && <LogsTab />}
    </div>
  );
}

// ---------------------------------------------------------------- vue d'ensemble

function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="rounded-panel bg-card p-4">
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted">{label}</p>
      {detail && <p className="mt-1 text-xs text-subtle">{detail}</p>}
    </div>
  );
}

function OverviewTab() {
  const { data, loading, error, notFound, retry } = useResource(() => adminApi.overview(), []);

  if (loading && !data) return <Loading />;
  if (error) {
    return (
      <div className="px-4 py-5 md:px-6">
        <ErrorState
          title="Vue d'ensemble indisponible"
          error={error}
          notFound={notFound}
          onRetry={retry}
        />
      </div>
    );
  }
  if (!data) return null;

  const days = Array.from({ length: 7 }, (_, index) =>
    new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10),
  );
  const peak = Math.max(1, ...days.map((day) => data.users.signupsByDay[day] ?? 0));

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Vue d'ensemble</h2>
      <p className="mt-1 text-sm text-muted">État du catalogue et de la communauté.</p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Utilisateurs"
          value={data.users.total}
          detail={`${data.users.byStatus.active} actifs`}
        />
        <Stat
          label="Artistes"
          value={data.artists.total}
          detail={`${data.artists.verified} certifiés`}
        />
        <Stat
          label="Morceaux"
          value={data.tracks.total}
          detail={`${data.tracks.withAudio} avec audio`}
        />
        <Stat
          label="Playlists"
          value={data.content.playlists}
          detail={`${data.content.favorites} favoris`}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <section className="rounded-panel bg-card p-4">
          <h3 className="text-sm font-semibold text-white">Rôles</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
              <li key={role} className="flex justify-between text-muted">
                <span>{ROLE_LABELS[role]}</span>
                <span className="font-semibold text-white">{data.users.byRole[role] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-panel bg-card p-4">
          <h3 className="text-sm font-semibold text-white">Inscriptions — 7 derniers jours</h3>
          <div className="mt-3 flex h-20 items-end gap-1.5">
            {days.map((day) => {
              const count = data.users.signupsByDay[day] ?? 0;
              return (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    title={`${count} inscription(s)`}
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.max(4, (count / peak) * 100)}%` }}
                  />
                  <span className="text-[10px] text-muted">{day.slice(8)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            {days.reduce((total, day) => total + (data.users.signupsByDay[day] ?? 0), 0)}{' '}
            inscription(s) cette semaine
          </p>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ vérifications

const VERIFICATION_FILTERS: Array<{ value: VerificationRequest['status']; label: string }> = [
  { value: 'pending', label: 'En attente' },
  { value: 'approved', label: 'Approuvées' },
  { value: 'rejected', label: 'Rejetées' },
];

function VerificationsTab() {
  const ask = useConfirm();
  const toast = useToast();
  const [status, setStatus] = useState<VerificationRequest['status']>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const requests = useResource(() => adminApi.verificationRequests(status), [status]);
  const artists = useResource(() => adminApi.artists({ limit: 200 }), []);
  const names = new Map((artists.data?.items ?? []).map((artist) => [artist.id, artist.name]));

  const review = async (request: VerificationRequest, next: 'approved' | 'rejected') => {
    const name = names.get(request.artist_id) ?? 'cet artiste';
    const ok = await ask({
      title:
        next === 'approved'
          ? `Certifier ${name} ?`
          : `Rejeter la demande de ${name} ?`,
      description:
        next === 'approved'
          ? "L'artiste recevra le badge certifié sur son profil et ses morceaux."
          : 'La demande passera en « rejetée ».',
      confirmLabel: next === 'approved' ? 'Certifier' : 'Rejeter',
      danger: next === 'rejected',
    });
    if (!ok) return;

    setBusy(request.id);
    try {
      await adminApi.reviewVerification(request.id, next);
      requests.refresh();
      toast.success(next === 'approved' ? 'Artiste certifié.' : 'Demande rejetée.');
    } catch (error) {
      toast.error(message(error, 'Action impossible'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Vérifications</h2>
      <p className="mt-1 text-sm text-muted">
        Demandes de certification d'artiste, preuves à l'appui.
      </p>

      <div className="mt-4 flex flex-wrap gap-1 rounded-full bg-card p-1">
        {VERIFICATION_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatus(filter.value)}
            aria-pressed={status === filter.value}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              status === filter.value
                ? 'bg-primary text-primary-contrast'
                : 'text-muted hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {requests.loading && !requests.data ? (
        <Loading />
      ) : requests.error ? (
        <ErrorState error={requests.error} onRetry={requests.retry} />
      ) : (requests.data ?? []).length === 0 ? (
        <Empty text="Aucune demande dans cette catégorie." />
      ) : (
        <ul className="mt-4 space-y-3">
          {(requests.data ?? []).map((request) => {
            const links = (
              [
                ['Instagram', request.instagram_url],
                ['TikTok', request.tiktok_url],
                ['YouTube', request.youtube_url],
                ['Spotify', request.spotify_url],
                ['SoundCloud', request.soundcloud_url],
                ['Site web', request.website_url],
              ] as Array<[string, string | null | undefined]>
            ).filter((entry): entry is [string, string] => Boolean(entry[1]));

            return (
              <li key={request.id} className="rounded-panel bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {names.get(request.artist_id) ?? `Artiste ${request.artist_id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted">Demandé le {formatDate(request.created_at)}</p>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => void review(request, 'approved')}
                        className={primaryButton}
                      >
                        <Check size={14} /> Certifier
                      </button>
                      <button
                        type="button"
                        disabled={busy === request.id}
                        onClick={() => void review(request, 'rejected')}
                        className={dangerButton}
                      >
                        <Ban size={14} /> Rejeter
                      </button>
                    </div>
                  )}
                </div>

                {links.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {links.map(([label, url]) => (
                      <li key={label}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {request.message && (
                  <p className="mt-2 whitespace-pre-line text-sm text-subtle">{request.message}</p>
                )}
                {request.admin_note && (
                  <p className="mt-2 text-xs text-muted">Note admin : {request.admin_note}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// --------------------------------------------------------------------- utilisateurs

function UsersTab() {
  const me = useAuthStore((state) => state.user);
  const ask = useConfirm();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const users = useResource(
    () => adminApi.users({ search, role, status, page }),
    [search, role, status, page],
  );

  const change = async (user: AdminUser, input: { role?: Role; status?: string }) => {
    const label = user.name || user.email;
    const ok = await ask({
      title: input.role
        ? `Donner le rôle « ${ROLE_LABELS[input.role]} » à ${label} ?`
        : `Passer ${label} en « ${STATUS_LABELS[input.status ?? ''] ?? input.status} » ?`,
      description:
        input.status === 'banned'
          ? "Le compte sera banni : l'utilisateur perd immédiatement l'accès."
          : input.status === 'suspended'
            ? "Le compte sera suspendu : l'utilisateur perd immédiatement l'accès."
            : 'Les droits du compte seront mis à jour.',
      confirmLabel: 'Confirmer',
      danger: Boolean(input.status && input.status !== 'active'),
    });
    if (!ok) return;

    setBusy(user.id);
    try {
      await adminApi.updateUser({ userId: user.id, ...input });
      users.refresh();
      toast.success('Compte mis à jour.');
    } catch (error) {
      toast.error(message(error, 'Modification impossible'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (user: AdminUser) => {
    const label = user.name || user.email;
    const ok = await ask({
      title: `Supprimer le compte de ${label} ?`,
      description:
        'Le compte sera définitivement supprimé. Ses playlists, favoris et écoutes restent en base.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;

    setBusy(user.id);
    try {
      await adminApi.deleteUser(user.id);
      users.refresh();
      toast.success('Compte supprimé.');
    } catch (error) {
      toast.error(message(error, 'Suppression impossible'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Utilisateurs</h2>
      <p className="mt-1 text-sm text-muted">Rôles, accès et suppression des comptes.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchForm
          value={draft}
          onChange={setDraft}
          onSubmit={() => {
            setSearch(draft.trim());
            setPage(1);
          }}
        />
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous les rôles</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ListState state={users} />

      {users.data && users.data.items.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-card">
            {users.data.items.map((user) => {
              const self = user.id === me?.id;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-sm font-bold text-white">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (user.name || user.email).slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.name || 'Sans nom'} {self && <span className="text-muted">(vous)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{user.email}</p>
                  </div>

                  <select
                    value={user.role}
                    disabled={self || busy === user.id}
                    onChange={(event) => void change(user, { role: event.target.value as Role })}
                    className={selectClass}
                    aria-label={`Rôle de ${user.email}`}
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((item) => (
                      <option key={item} value={item}>
                        {ROLE_LABELS[item]}
                      </option>
                    ))}
                  </select>

                  <select
                    value={user.status ?? 'active'}
                    disabled={self || busy === user.id}
                    onChange={(event) => void change(user, { status: event.target.value })}
                    className={selectClass}
                    aria-label={`Statut de ${user.email}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  {!self && (
                    <button
                      type="button"
                      disabled={busy === user.id}
                      onClick={() => void remove(user)}
                      className={dangerButton}
                      aria-label={`Supprimer ${user.email}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Pager page={users.data.page} data={users.data} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------- artistes

function ArtistsTab() {
  const ask = useConfirm();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const artists = useResource(
    () => adminApi.artists({ search, verified, page }),
    [search, verified, page],
  );

  const setBadge = async (artist: AdminArtist) => {
    const next = !artist.verified;
    const ok = await ask({
      title: next ? `Certifier ${artist.name} ?` : `Retirer le badge de ${artist.name} ?`,
      description: next
        ? 'Le badge certifié apparaîtra sur son profil et ses morceaux.'
        : "L'artiste perdra son badge certifié.",
      confirmLabel: next ? 'Certifier' : 'Retirer',
      danger: !next,
    });
    if (!ok) return;

    setBusy(artist.id);
    try {
      await adminApi.setArtistVerified(artist.id, next);
      artists.refresh();
      toast.success(next ? 'Badge certifié accordé.' : 'Badge retiré.');
    } catch (error) {
      toast.error(message(error, 'Action impossible'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (artist: AdminArtist) => {
    const ok = await ask({
      title: `Supprimer le profil de ${artist.name} ?`,
      description:
        'Le profil artiste sera supprimé. Ses morceaux resteront dans le catalogue, rattachés à un artiste inexistant.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;

    setBusy(artist.id);
    try {
      await adminApi.deleteArtist(artist.id);
      artists.refresh();
      toast.success('Profil artiste supprimé.');
    } catch (error) {
      toast.error(message(error, 'Suppression impossible'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Artistes</h2>
      <p className="mt-1 text-sm text-muted">Certification et nettoyage des profils.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchForm
          value={draft}
          onChange={setDraft}
          onSubmit={() => {
            setSearch(draft.trim());
            setPage(1);
          }}
        />
        <select
          value={verified}
          onChange={(event) => {
            setVerified(event.target.value);
            setPage(1);
          }}
          className={selectClass}
          aria-label="Filtrer par certification"
        >
          <option value="">Tous</option>
          <option value="true">Certifiés</option>
          <option value="false">Non certifiés</option>
        </select>
      </div>

      <ListState state={artists} />

      {artists.data && artists.data.items.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-card">
            {artists.data.items.map((artist) => (
              <li key={artist.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-sm font-bold text-white">
                  {artist.image_url ? (
                    <img src={artist.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    artist.name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {artist.name}
                    {artist.verified && <BadgeCheck size={15} className="text-primary" />}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {[artist.genres, artist.country].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy === artist.id}
                  onClick={() => void setBadge(artist)}
                  className={artist.verified ? ghostButton : primaryButton}
                >
                  <BadgeCheck size={14} /> {artist.verified ? 'Retirer le badge' : 'Certifier'}
                </button>
                <button
                  type="button"
                  disabled={busy === artist.id}
                  onClick={() => void remove(artist)}
                  className={dangerButton}
                  aria-label={`Supprimer ${artist.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <Pager page={artists.data.page} data={artists.data} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------- morceaux

function TracksTab() {
  const ask = useConfirm();
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const tracks = useResource(() => adminApi.tracks({ search, page }), [search, page]);

  const remove = async (track: AdminTrack) => {
    const ok = await ask({
      title: `Supprimer « ${track.title} » ?`,
      description:
        'Le fichier audio sera supprimé du stockage, ainsi que ses écoutes, favoris et entrées de playlists.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;

    setBusy(track.id);
    try {
      await adminApi.deleteTrack(track.id);
      tracks.refresh();
      toast.success('Morceau supprimé.');
    } catch (error) {
      toast.error(message(error, 'Suppression impossible'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Morceaux</h2>
      <p className="mt-1 text-sm text-muted">Catalogue complet, tous artistes confondus.</p>

      <div className="mt-4">
        <SearchForm
          value={draft}
          onChange={setDraft}
          onSubmit={() => {
            setSearch(draft.trim());
            setPage(1);
          }}
        />
      </div>

      <ListState state={tracks} />

      {tracks.data && tracks.data.items.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-card">
            {tracks.data.items.map((track) => (
              <li key={track.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{track.title}</p>
                  <p className="truncate text-xs text-muted">
                    Artiste {track.artist_id?.slice(0, 8) ?? 'inconnu'} ·{' '}
                    {track.status ?? 'brouillon'} · {formatDate(track.created_at)}
                  </p>
                </div>
                {!track.audio_url && (
                  <span className="rounded-full bg-elevated px-2 py-1 text-[10px] font-bold uppercase text-muted">
                    sans audio
                  </span>
                )}
                <button
                  type="button"
                  disabled={busy === track.id}
                  onClick={() => void remove(track)}
                  className={dangerButton}
                  aria-label={`Supprimer ${track.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <Pager page={tracks.data.page} data={tracks.data} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------- journal

function LogsTab() {
  const [page, setPage] = useState(1);
  const logs = useResource(() => adminApi.logs({ page }), [page]);

  return (
    <div className="px-4 py-5 md:px-6">
      <h2 className="text-2xl font-extrabold tracking-tight text-white">Journal</h2>
      <p className="mt-1 text-sm text-muted">Actions récentes des administrateurs.</p>

      <ListState state={logs} />

      {logs.data && logs.data.items.length > 0 && (
        <>
          <ul className="mt-3 divide-y divide-line rounded-panel bg-card">
            {logs.data.items.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {log.action.replaceAll('_', ' ')}
                </p>
                <p className="text-xs text-muted">
                  {log.target_type ?? 'élément'} {log.target_id?.slice(0, 8) ?? ''} ·{' '}
                  {formatDate(log.created_at)} · admin {log.admin_user_id?.slice(0, 8) ?? '—'}
                </p>
                {log.details && (
                  <p className="mt-1 truncate text-xs text-subtle">{log.details}</p>
                )}
              </li>
            ))}
          </ul>
          <Pager page={logs.data.page} data={logs.data} onChange={setPage} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------- communs

const selectClass =
  'rounded-full border border-line bg-elevated px-3 py-1.5 text-xs font-semibold text-white focus:border-primary focus:outline-none disabled:opacity-40';

function SearchForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={submit} className="flex flex-1 gap-2 sm:max-w-xs">
      <div className="relative flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Rechercher…"
          aria-label="Rechercher"
          className="w-full rounded-full border border-line bg-elevated py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>
      <button type="submit" className={ghostButton}>
        Chercher
      </button>
    </form>
  );
}

function Pager<T>({
  page,
  data,
  onChange,
}: {
  page: number;
  data: Page<T>;
  onChange: (page: number) => void;
}) {
  if (page === 1 && !data.hasMore) {
    return <p className="mt-2 text-xs text-muted">{data.total} résultat(s)</p>;
  }
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-muted">
      <span>{data.total} résultat(s)</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className={ghostButton}
        >
          Précédent
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={!data.hasMore}
          onClick={() => onChange(page + 1)}
          className={ghostButton}
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

function ListState<T>({ state }: { state: AsyncState<Page<T>> }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error) {
    return (
      <ErrorState
        error={state.error}
        notFound={state.notFound}
        onRetry={state.retry}
      />
    );
  }
  if (state.data && state.data.items.length === 0) return <Empty text="Aucun résultat." />;
  return null;
}

function Loading() {
  return (
    <div className="flex h-28 items-center justify-center gap-2 text-sm text-muted">
      <Loader2 size={16} className="animate-spin" /> Chargement…
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-muted">{text}</p>;
}
