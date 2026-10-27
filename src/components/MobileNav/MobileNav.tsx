import { Home, Library, Mic2, Search, BarChart3 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import type { ViewName } from '../../types/music';

interface MobileNavProps {
  view: ViewName;
  onNavigate: (view: ViewName) => void;
  /** Barre repliée : Accueil à gauche, Bibliothèque à droite (défilement). */
  compact?: boolean;
}

/** Navigation principale sur mobile (la sidebar est masquée en dessous de md). */
export function MobileNav({ view, onNavigate, compact = false }: MobileNavProps) {
  const user = useAuthStore((s) => s.user);
  const canPublish =
    user?.role === 'artiste' || user?.role === 'developper' || user?.role === 'admin';
  // Accueil au centre de la barre (demande produit), Bibliothèque à droite.
  const items: Array<{ view: ViewName; label: string; icon: typeof Home }> = [
    { view: 'search', label: 'Rechercher', icon: Search },
    { view: 'charts', label: 'Classement', icon: BarChart3 },
    { view: 'home', label: 'Accueil', icon: Home },
    { view: 'library', label: 'Bibliothèque', icon: Library },
    ...(canPublish
      ? [{ view: 'artist' as const, label: 'Artiste', icon: Mic2 }]
      : []),
  ];

  // Barre réduite : seuls Accueil et Bibliothèque restent, le lecteur occupe
  // le centre (voir Player).
  const compactItems = items.filter((item) => item.view === 'home' || item.view === 'library');

  return (
    <>
      {/* Le conteneur ne capture jamais les clics : sans ça, sa zone vide au
          centre recouvre le lecteur (z-30) et bloque lecture/pause. */}
      <div className="pointer-events-none fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))] z-40 flex h-[60px] items-center justify-between md:hidden">
        {compactItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              aria-hidden={!compact}
              tabIndex={compact ? undefined : -1}
              className={`glass flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 motion-reduce:transition-none ${
                compact
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0'
              } ${active ? 'text-primary' : 'text-muted hover:text-white'}`}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div
        className={`fixed inset-x-2 bottom-[calc(16px+env(safe-area-inset-bottom))] z-40 flex justify-center transition-all duration-300 motion-reduce:transition-none md:hidden ${
          compact ? 'pointer-events-none translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <nav
          aria-label="Navigation principale"
          aria-hidden={compact}
          className="glass relative flex w-auto min-w-[min(300px,100%)] max-w-[420px] items-center justify-between rounded-full px-1.5 py-1.5"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                aria-current={active ? 'page' : undefined}
                tabIndex={compact ? -1 : undefined}
                className={`group relative z-10 flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                  active ? 'text-primary' : 'text-muted hover:text-white'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ease-out motion-reduce:transition-none ${
                    active
                      ? '-translate-y-[22px] scale-150 bg-primary text-primary-contrast shadow-[0_8px_20px_rgb(var(--primary)/0.45)]'
                      : 'bg-transparent group-hover:-translate-y-0.5 group-hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <span className={`leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
