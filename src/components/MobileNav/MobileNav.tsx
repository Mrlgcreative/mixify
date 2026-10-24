import { Home, Library, Mic2, Search } from 'lucide-react';

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
    { view: 'library', label: 'Bibliothèque', icon: Library },
    ...(canPublish
      ? [{ view: 'artist' as const, label: 'Artiste', icon: Mic2 }]
      : []),
  ];

  return (
    <div className="fixed bottom-[76px] left-0 right-0 z-40 flex justify-center px-3 pb-2 md:hidden">
      <nav
        aria-label="Navigation principale"
        className="flex w-full max-w-[420px] items-center justify-between rounded-full border border-white/10 bg-panel/95 px-2 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
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
                active ? 'bg-white/10 text-primary' : 'text-muted hover:text-white'
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
