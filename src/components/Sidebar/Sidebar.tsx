import { Heart, Home, Library, Search, Mic2, BarChart3 } from 'lucide-react';

import { AuthPanel } from '../Auth/AuthPanel';
import { Logo } from '../Logo/Logo';
import { useHomeFeed } from '../../hooks/useMusicApi';
import { useAuthStore } from '../../store/authStore';
import type { Playlist, ViewName } from '../../types/music';

interface SidebarProps {
  view: ViewName;
  onNavigate: (view: ViewName) => void;
  /** Ouvre une playlist dans la bibliothèque. */
  onSelectPlaylist: (id: string) => void;
}

function isPlaylist(item: unknown): item is Playlist {
  return typeof item === 'object' && item !== null && Array.isArray((item as Playlist).tracks);
}

const NAV_ITEMS: Array<{ view: ViewName; label: string; icon: typeof Home }> = [
  { view: 'home', label: 'Accueil', icon: Home },
  { view: 'search', label: 'Rechercher', icon: Search },
  { view: 'charts', label: 'Classement', icon: BarChart3 },
  { view: 'library', label: 'Bibliothèque', icon: Library },
];

/** Navigation principale + raccourcis. */
export function Sidebar({ view, onNavigate, onSelectPlaylist }: SidebarProps) {
  const { data } = useHomeFeed();
  const user = useAuthStore((s) => s.user);
  const playlists = (data?.shelves.flatMap((shelf) => shelf.items) ?? []).filter(isPlaylist);
  const canPublish =
    user?.role === 'artiste' || user?.role === 'developper' || user?.role === 'admin';
  const items = [
    ...NAV_ITEMS,
    ...(canPublish
      ? [{ view: 'artist' as const, label: 'Espace artiste', icon: Mic2 }]
      : []),
  ];

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col gap-6 rounded-panel bg-panel p-3 md:flex">
      <div className="px-2 pt-2">
        <Logo />
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition ${
                active ? 'bg-elevated text-white' : 'text-subtle hover:text-white'
              }`}
            >
              <Icon size={20} className={active ? 'text-primary' : ''} />
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium text-subtle transition hover:text-white"
        >
          <Heart size={20} />
          Titres likés
        </button>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Vos playlists
        </p>
        <ul className="flex flex-col">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button
                type="button"
                onClick={() => onSelectPlaylist(playlist.id)}
                className="w-full truncate rounded-card px-3 py-2 text-left text-sm text-subtle transition hover:text-white"
              >
                {playlist.title}
              </button>
            </li>
          ))}
          {playlists.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted">
              {data ? 'Aucune playlist' : 'Chargement…'}
            </li>
          )}
        </ul>
      </div>

      <AuthPanel onOpen={() => onNavigate('profile')} />
    </aside>
  );
}
