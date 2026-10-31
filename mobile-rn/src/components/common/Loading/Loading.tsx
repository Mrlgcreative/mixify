import { SkeletonList } from '../Skeleton/Skeleton';

/** État de chargement des vues : squelette de liste plutôt qu'un spinner. */
export function Loading({ label = 'Chargement…' }: { label?: string }) {
  return <SkeletonList rows={6} label={label} />;
}
