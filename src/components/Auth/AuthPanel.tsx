import { ChevronRight, LogOut, UserRound } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';

interface AuthPanelProps {
  /** Ouvre le profil du compte (carte d'identité cliquable). */
  onOpen?: () => void;
}

/** Compte connecté : identité + déconnexion (l'accès est filtré en amont par AuthScreen). */
export function AuthPanel({ onOpen }: AuthPanelProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const identity = (
    <>
      <UserRound size={16} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-white">{user.name || user.email}</p>
        <p className="text-[11px] text-muted">{user.role}</p>
      </div>
      {onOpen && <ChevronRight size={14} className="shrink-0 text-muted" />}
    </>
  );

  return (
    <div className="rounded-card bg-elevated px-3 py-2">
      <div className="flex items-center gap-2">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            {identity}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">{identity}</div>
        )}
        <button
          type="button"
          onClick={logout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
          className="text-muted transition hover:text-white"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );
}
