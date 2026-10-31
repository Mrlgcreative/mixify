import type { AuthUser } from '@/types/auth';
import { Cover } from '../Cover/Cover';

interface AvatarProps {
  user: AuthUser;
  size?: number;
}

/** Avatar du compte : photo si présente, sinon pochette générative. */
export function Avatar({ user, size = 40 }: AvatarProps) {
  return (
    <Cover
      seed={user.id}
      title={user.name ?? user.email}
      imageUrl={user.avatar_url ?? undefined}
      size={size}
      round={size / 2}
      textSize={Math.round(size / 3)}
    />
  );
}
