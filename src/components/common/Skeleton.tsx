interface SkeletonProps {
  className?: string;
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(' ');
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-white/10', className)} />;
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  if (lines === 1) {
    return <Skeleton className={cn('h-4 w-full', className)} />;
  }
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Skeleton className="aspect-square w-full rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTrackRow({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-2', className)}>
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-3 w-8" />
    </div>
  );
}
