import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react';

import { AuthPanel } from '../Auth/AuthPanel';
import { useAuthStore } from '../../store/authStore';
import type { ViewName } from '../../types/music';

interface HeaderProps {
  view: ViewName;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
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
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  query,
  onQueryChange,
  onSubmitQuery,
  onOpenProfile,
}: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-panel/95 px-3 py-3 backdrop-blur md:gap-4 md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          aria-label="Précédent"
          className="rounded-full bg-black/40 p-1.5 text-muted transition enabled:hover:text-white disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          aria-label="Suivant"
          className="rounded-full bg-black/40 p-1.5 text-muted transition enabled:hover:text-white disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <h1 className="hidden text-base font-semibold text-white lg:block">{TITLES[view]}</h1>

      <form
        className="ml-auto flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitQuery();
        }}
      >
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Rechercher un titre, un artiste…"
            aria-label="Rechercher"
            className="w-40 rounded-full border border-line bg-elevated py-2 pl-9 pr-4 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none sm:w-64"
          />
        </div>
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
