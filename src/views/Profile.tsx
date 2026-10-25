import { useEffect, useState, type FormEvent } from 'react';
import {
  BarChart3,
  Check,
  Heart,
  History,
  ListMusic,
  Loader2,
  LogOut,
  Settings,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';

import { api } from '../api/musicApi';
import { AutoMixToggle } from '../components/AutoMix/AutoMixToggle';
import { CrossfadeSettings } from '../components/AutoMix/CrossfadeSettings';
import { Cover } from '../components/common/Cover';
import { MediaCard } from '../components/common/MediaCard';
import { TrackList } from '../components/common/TrackList';
import { FollowButton } from '../components/Follow/FollowButton';
import { AccentSettings, SimpleModeToggle } from '../components/settings/AccentSettings';
import { DataSaverSettings } from '../components/settings/DataSaverSettings';
import { useHistory, useLibrary, type AsyncState } from '../hooks/useMusicApi';
import { useAuthStore } from '../store/authStore';
import { useFollows } from '../store/followsStore';
import { usePlayer } from '../store/playerStore';
import type { AuthUser } from '../types/auth';
import type { HistoryEntry, Library, ViewName } from '../types/music';
import { computeProfileStats } from '../utils/profileStats';

type Tab = 'account' | 'playlists' | 'favorites' | 'settings' | 'history' | 'stats' | 'followers';

const TABS: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
  { id: 'account', label: 'Compte', icon: UserRound },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'followers', label: 'Abonnés', icon: Users },
];

const ROLE_LABELS: Record<string, string> = {
  utilisateur: 'Auditeur',
  artiste: 'Artiste',
  developper: 'Développeur',
  admin: 'Admin',
};

interface ProfileProps {
  onSelectPlaylist: (id: string) => void;
  onNavigate: (view: ViewName) => void;
}

/** Profil du compte : identité, bibliothèque, réglages, historique et abonnements. */
export function Profile({ onSelectPlaylist, onNavigate }: ProfileProps) {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('account');
  const [historyRevision, setHistoryRevision] = useState(0);
  const library = useLibrary();
  const history = useHistory(historyRevision);

  if (!user) return null;

  return (
    <div className="px-4 py-6 md:px-6">
      <section className="flex flex-col gap-4 rounded-panel bg-gradient-to-br from-primary/25 via-elevated to-panel p-5 sm:flex-row sm:items-center md:p-6">
        <Avatar user={user} className="h-20 w-20 shrink-0 text-2xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Profil</p>
          <h2 className="truncate text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            {user.name || 'Auditeur'}
          </h2>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <span className="w-fit rounded-full bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-subtle">
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </section>

      <div className="scrollbar-thin mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                active
                  ? 'border-primary text-white'
                  : 'border-transparent text-muted hover:text-white'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="pt-6">
        {tab === 'account' && <AccountTab user={user} />}
        {tab === 'playlists' && (
          <PlaylistsTab library={library} onSelect={onSelectPlaylist} onNavigate={onNavigate} />
        )}
        {tab === 'favorites' && <FavoritesTab library={library} />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'history' && (
          <HistoryTab
            history={history}
            onCleared={() => setHistoryRevision((value) => value + 1)}
          />
        )}
        {tab === 'stats' && <StatsTab history={history} library={library} />}
        {tab === 'followers' && <FollowersTab onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

function Avatar({ user, className = '' }: { user: AuthUser; className?: string }) {
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className={`rounded-full border-2 border-white/10 object-cover ${className}`}
      />
    );
  }
  return (
    <Cover
      seed={user.id}
      title={user.name ?? user.email}
      rounded="full"
      className={className}
    />
  );
}

function AccountTab({ user }: { user: AuthUser }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user.name ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // Après un enregistrement, le store renvoie l'utilisateur à jour.
  useEffect(() => {
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setAvatarUrl(user.avatar_url ?? '');
  }, [user]);

  const dirty =
    name.trim() !== (user.name ?? '') ||
    bio.trim() !== (user.bio ?? '') ||
    avatarUrl.trim() !== (user.avatar_url ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setMessage({ kind: 'error', text: 'Le nom est requis.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setUser(updated);
      setMessage({ kind: 'ok', text: 'Profil mis à jour.' });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Mise à jour impossible.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-white">Nom affiché</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            className="w-full rounded-card border border-line bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-white">Bio</span>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Quelques mots sur votre univers musical…"
            className="w-full resize-y rounded-card border border-line bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
          />
          <span className="mt-1 block text-right text-[11px] text-muted">{bio.length}/500</span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-white">Avatar (URL)</span>
          <input
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://…"
            className="w-full rounded-card border border-line bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !dirty || !name.trim()}
            className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-black transition enabled:hover:scale-105 disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {message && (
            <span
              className={`flex items-center gap-1 text-xs ${
                message.kind === 'ok' ? 'text-primary' : 'text-danger'
              }`}
            >
              {message.kind === 'ok' && <Check size={14} />}
              {message.text}
            </span>
          )}
        </div>
      </form>

      <aside className="rounded-panel border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} className="h-14 w-14 text-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name || 'Auditeur'}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role] ?? user.role}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-muted">Adresse e-mail</dt>
            <dd className="truncate text-white">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Membre depuis</dt>
            <dd className="text-white">{formatDate(user.created_at)}</dd>
          </div>
          {user.birth_date && (
            <div>
              <dt className="text-xs text-muted">Date de naissance</dt>
              <dd className="text-white">{formatDate(user.birth_date)}</dd>
            </div>
          )}
        </dl>
      </aside>
    </div>
  );
}

function PlaylistsTab({
  library,
  onSelect,
  onNavigate,
}: {
  library: AsyncState<Library>;
  onSelect: (id: string) => void;
  onNavigate: (view: ViewName) => void;
}) {
  if (library.loading && !library.data) return <Loading label="Chargement des playlists…" />;
  if (library.error) return <p className="text-sm text-danger">{library.error}</p>;

  const playlists = library.data?.playlists ?? [];
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Vos playlists</h3>
          <p className="text-sm text-muted">{playlists.length} playlist(s)</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white transition hover:bg-line"
        >
          Gérer dans la bibliothèque
        </button>
      </div>
      {playlists.length === 0 ? (
        <p className="text-sm text-muted">
          Aucune playlist pour l’instant. Créez-en une depuis la bibliothèque.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {playlists.map((playlist) => (
            <MediaCard
              key={playlist.id}
              seed={playlist.id}
              title={playlist.title}
              subtitle={playlist.description}
              onSelect={() => onSelect(playlist.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FavoritesTab({ library }: { library: AsyncState<Library> }) {
  if (library.loading && !library.data) return <Loading label="Chargement des favoris…" />;
  if (library.error) return <p className="text-sm text-danger">{library.error}</p>;

  const liked = library.data?.liked ?? [];
  return (
    <section>
      <h3 className="text-xl font-bold text-white">Titres likés</h3>
      <p className="mb-4 text-sm text-muted">{liked.length} titre(s)</p>
      {liked.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun favori pour l’instant : cliquez sur le cœur d’un morceau.
        </p>
      ) : (
        <TrackList tracks={liked} />
      )}
    </section>
  );
}

function SettingsTab() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="max-w-2xl space-y-4">
      <section className="overflow-hidden rounded-panel border border-line bg-card">
        <div className="border-b border-line px-4 py-4">
          <AutoMixToggle />
        </div>
        <CrossfadeSettings />
        <div className="border-t border-line">
          <AccentSettings />
        </div>
        <div className="border-t border-line">
          <SimpleModeToggle />
        </div>
        <div className="border-t border-line">
          <DataSaverSettings />
        </div>
      </section>

      <section className="rounded-panel border border-line bg-card px-4 py-4">
        <p className="text-sm font-semibold text-white">Session</p>
        <p className="mb-3 mt-1 text-xs text-muted">
          Déconnecte ce navigateur. Votre historique et vos abonnements restent liés au compte.
        </p>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-white transition hover:border-danger hover:text-danger"
        >
          <LogOut size={16} /> Se déconnecter
        </button>
      </section>
    </div>
  );
}

function HistoryTab({
  history,
  onCleared,
}: {
  history: AsyncState<HistoryEntry[]>;
  onCleared: () => void;
}) {
  const playTrack = usePlayer((s) => s.playTrack);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = async () => {
    if (!window.confirm('Effacer tout votre historique d’écoute ?')) return;
    setClearing(true);
    setError(null);
    try {
      await api.clearHistory();
      onCleared();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setClearing(false);
    }
  };

  const entries = history.data ?? [];

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Historique</h3>
          <p className="text-sm text-muted">{entries.length} écoute(s) récente(s)</p>
        </div>
        <button
          type="button"
          onClick={() => void clear()}
          disabled={clearing || entries.length === 0}
          className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-danger hover:text-danger disabled:opacity-40"
        >
          <Trash2 size={16} /> {clearing ? 'Suppression…' : 'Tout effacer'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {history.loading && !history.data ? (
        <Loading label="Chargement de l’historique…" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">
          Votre historique est vide : lancez un morceau pour le remplir.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                disabled={!entry.track}
                onClick={() => entry.track && void playTrack(entry.track)}
                title={entry.track ? `Réécouter ${entry.title}` : 'Morceau externe : lecture indisponible'}
                className="flex w-full items-center gap-3 py-3 text-left transition enabled:hover:bg-elevated disabled:cursor-default"
              >
                <Cover
                  seed={entry.track?.id ?? entry.id}
                  title={entry.title}
                  className="h-11 w-11 shrink-0 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{entry.title}</p>
                  <p className="truncate text-xs text-muted">{entry.artist}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {formatDate(entry.playedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {history.error && <p className="mt-3 text-sm text-danger">{history.error}</p>}
    </section>
  );
}

function StatsTab({
  history,
  library,
}: {
  history: AsyncState<HistoryEntry[]>;
  library: AsyncState<Library>;
}) {
  if (history.loading && !history.data) return <Loading label="Calcul des statistiques…" />;
  if (history.error) return <p className="text-sm text-danger">{history.error}</p>;

  const entries = history.data ?? [];
  const stats = computeProfileStats(entries);
  const liked = library.data?.liked.length ?? 0;

  const cards = [
    { label: 'Écoutes', value: String(stats.plays) },
    { label: 'Temps d’écoute', value: formatListening(stats.listeningMs) },
    { label: 'Artistes', value: String(stats.uniqueArtists) },
    { label: 'Titres distincts', value: String(stats.uniqueTracks) },
    { label: '7 derniers jours', value: String(stats.last7Days) },
    { label: 'Favoris', value: String(liked) },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-panel border border-line bg-card p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="mt-1 text-xl font-extrabold text-white">{card.value}</p>
          </div>
        ))}
      </section>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">
          Les statistiques apparaîtront dès vos premières écoutes.
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <TopList title="Artistes les plus écoutés" rows={stats.topArtists} />
          <TopList title="Genres les plus écoutés" rows={stats.topGenres} />
        </div>
      )}
    </div>
  );
}

function TopList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; plays: number }>;
}) {
  const max = rows[0]?.plays ?? 1;
  return (
    <section>
      <h3 className="mb-3 text-lg font-bold text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Pas encore assez de données.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.name}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-white">{row.name}</span>
                <span className="shrink-0 text-xs text-muted">{row.plays} écoute(s)</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(4, (row.plays / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FollowersTab({ onNavigate }: { onNavigate: (view: ViewName) => void }) {
  const user = useAuthStore((s) => s.user);
  const { following, followers, myArtist, loaded, error } = useFollows();
  const canPublish =
    user?.role === 'artiste' || user?.role === 'developper' || user?.role === 'admin';

  if (!loaded) return <Loading label="Chargement des abonnements…" />;

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-xl font-bold text-white">Vos abonnés</h3>
        {myArtist ? (
          <>
            <p className="mt-1 text-sm text-muted">
              {myArtist.name} · {followers.length} abonné(s)
            </p>
            {followers.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Personne ne suit encore votre profil artiste.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {followers.map((follower) => (
                  <li key={follower.id} className="flex items-center gap-3 py-3">
                    <Cover
                      seed={follower.id}
                      title={follower.name}
                      rounded="full"
                      className="h-10 w-10 text-xs"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{follower.name}</p>
                      {follower.followedAt && (
                        <p className="text-xs text-muted">
                          Depuis le {formatDate(follower.followedAt)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="mt-3 rounded-panel border border-line bg-card p-5">
            <p className="text-sm font-semibold text-white">Pas encore de profil artiste</p>
            <p className="mt-1 text-sm text-muted">
              Vos abonnés apparaîtront ici dès que votre compte aura un profil artiste.
            </p>
            {canPublish && (
              <button
                type="button"
                onClick={() => onNavigate('artist')}
                className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black"
              >
                Ouvrir l’espace artiste
              </button>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">Vos abonnements</h3>
            <p className="text-sm text-muted">{following.length} artiste(s) suivi(s)</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="rounded-full bg-elevated px-4 py-2 text-sm font-semibold text-white transition hover:bg-line"
          >
            Découvrir des artistes
          </button>
        </div>

        {following.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun abonnement. Suivez un artiste depuis les résultats de recherche.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {following.map((artist) => (
              <li key={artist.id} className="flex items-center gap-3 py-3">
                <Cover
                  seed={artist.id}
                  title={artist.name}
                  rounded="full"
                  className="h-11 w-11 shrink-0 text-xs"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{artist.name}</p>
                  <p className="text-xs text-muted">
                    {artist.followers} abonné{artist.followers > 1 ? 's' : ''}
                  </p>
                </div>
                <FollowButton artist={artist} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center gap-3 text-muted">
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatListening(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
