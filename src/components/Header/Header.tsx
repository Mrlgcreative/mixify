import { useRef, useState } from 'react';
import { Disc, Music, Search, UserRound, X } from 'lucide-react';

import { AuthPanel } from '../Auth/AuthPanel';
import { useAuthStore } from '../../store/authStore';
import { useSearchSuggestions } from '../../hooks/useMusicApi';
import type { ViewName } from '../../types/music';
import { Cover } from '../common/Cover';

interface HeaderProps {
  view: ViewName;
  query: string;
  onQueryChange: (query: string) => void;
  onSubmitQuery: () => void;
  /** Ouvre le profil du compte connecté (menu mobile). */
  onOpenProfile: () => void;
}

const TITLES: Record<ViewName, string> = {
  home: 'Accueil',
  search: 'Rechercher',
  library: 'Bibliothèque',
  artist: 'Espace artiste',
  profile: 'Profil',
};

/** Header sticky : historique de navigation + recherche. */
export function Header({
  view,
  query,
  onQueryChange,
  onSubmitQuery,
  onOpenProfile,
}: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const [accountOpen, setAccountOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: suggestions } = useSearchSuggestions(query);
  const { tracks = [], artists = [], albums = [] } = suggestions ?? {
    tracks: [],
    artists: [],
    albums: [],
    playlists: [],
  };
  const showSuggestions = focused && query.trim().length >= 2;

  const applySuggestion = (value: string) => {
    onQueryChange(value);
    setFocused(false);
    inputRef.current?.blur();
    onSubmitQuery();
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-panel px-3 py-3 md:gap-4 md:px-6">
      <h1 className="hidden text-base font-semibold text-white lg:block">{TITLES[view]}</h1>

      <form
        className="relative ml-auto flex w-full flex-1 items-center justify-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setFocused(false);
          onSubmitQuery();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Rechercher un titre, un artiste…"
            aria-label="Rechercher"
            className="w-full rounded-full border border-line bg-elevated py-2 pl-9 pr-9 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                onQueryChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted transition hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {showSuggestions && (
          <div className="absolute right-0 top-11 z-50 w-full overflow-hidden rounded-panel border border-line bg-panel shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
            {artists.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <UserRound size={14} className="text-primary" />
                  Artistes
                </div>
                {artists.slice(0, 3).map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(artist.name)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
                  >
                    <Cover seed={artist.id} title={artist.name} className="h-10 w-10 rounded-full" imageUrl={artist.imageUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{artist.name}</p>
                      <p className="truncate text-xs text-muted">Artiste</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {tracks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Music size={14} className="text-primary" />
                  Titres
                </div>
                {tracks.slice(0, 4).map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(track.title)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
                  >
                    <Cover seed={track.id} title={track.title} className="h-10 w-10" imageUrl={track.album?.coverUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{track.title}</p>
                      <p className="truncate text-xs text-muted">{track.artist.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {albums.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Disc size={14} className="text-primary" />
                  Albums
                </div>
                {albums.slice(0, 2).map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(album.title)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-elevated"
                  >
                    <Cover seed={album.id} title={album.title} className="h-10 w-10" imageUrl={album.coverUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{album.title}</p>
                      <p className="truncate text-xs text-muted">{album.artist?.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setFocused(false);
                onSubmitQuery();
              }}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-sm text-primary transition hover:bg-elevated"
            >
              <Search size={16} />
              Voir tous les résultats pour « {query} »
            </button>
          </div>
        )}
      </form>

      {user && (
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-label="Mon compte"
            className="rounded-full bg-black/40 p-2 text-muted transition hover:text-white"
          >
            <UserRound size={18} />
          </button>
          {accountOpen && (
            <>
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setAccountOpen(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="absolute right-0 top-11 z-30 w-64 rounded-panel border border-line bg-panel p-2 shadow-card">
                <AuthPanel
                  onOpen={() => {
                    setAccountOpen(false);
                    onOpenProfile();
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
