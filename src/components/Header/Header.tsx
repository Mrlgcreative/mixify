import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

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
}

const TITLES: Record<ViewName, string> = {
  home: 'Accueil',
  search: 'Rechercher',
  library: 'Bibliothèque',
  artist: 'Espace artiste',
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
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 bg-panel/95 px-4 py-3 backdrop-blur md:px-6">
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
            className="w-44 rounded-full border border-line bg-elevated py-2 pl-9 pr-4 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none sm:w-64"
          />
        </div>
      </form>
    </header>
  );
}
