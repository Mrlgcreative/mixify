import { Home, Library, Mic2, Search, BarChart3 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import type { ViewName } from '../../types/music';

interface MobileNavProps {
  view: ViewName;
  onNavigate: (view: ViewName) => void;
}

/** Navigation principale sur mobile (la sidebar est masquée en dessous de md). */
export function MobileNav({ view, onNavigate }: MobileNavProps) {
  const user = useAuthStore((s) => s.user);
  const canPublish =
    user?.role === 'artiste' || user?.role === 'developper' || user?.role === 'admin';
  const items: Array<{ view: ViewName; label: string; icon: typeof Home }> = [
    { view: 'home', label: 'Accueil', icon: Home },
    { view: 'search', label: 'Rechercher', icon: Search },
    { view: 'charts', label: 'Classement', icon: BarChart3 },
    { view: 'library', label: 'Bibliothèque', icon: Library },
    ...(canPublish
      ? [{ view: 'artist' as const, label: 'Artiste', icon: Mic2 }]
      : []),
  ];

  return (
    <div className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))] z-40 flex justify-center md:hidden">
      <nav
        aria-label="Navigation principale"
        className="glass flex w-full max-w-[420px] items-center justify-between rounded-[22px] px-1.5 py-1.5"
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
              className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[10px] font-medium transition ${
                active ? 'bg-elevated text-primary' : 'text-muted hover:text-white'
              }`}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
