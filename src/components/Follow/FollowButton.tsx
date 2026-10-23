import { UserCheck, UserPlus } from 'lucide-react';

import { useFollows } from '../../store/followsStore';
import type { Artist } from '../../types/music';

interface FollowButtonProps {
  artist: Artist;
  className?: string;
}

/** Bouton d'abonnement à un profil artiste (état partagé avec le profil). */
export function FollowButton({ artist, className = '' }: FollowButtonProps) {
  const following = useFollows((state) =>
    state.following.some((item) => item.id === artist.id),
  );
  const busy = useFollows((state) => state.busyId === artist.id);
  const toggle = useFollows((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={() => void toggle(artist)}
      disabled={busy}
      aria-pressed={following}
      className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        following
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-line bg-elevated text-white hover:border-primary/60'
      } ${className}`}
    >
      {following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? 'Abonné' : "S'abonner"}
    </button>
  );
}
