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
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden"
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
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition ${
              active ? 'text-primary' : 'text-muted hover:text-white'
            }`}
          >
            <Icon size={20} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
