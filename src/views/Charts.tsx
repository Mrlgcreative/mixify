import { useState } from 'react';
import { Play, TrendingUp } from 'lucide-react';

import type { ChartPeriod } from '../api/musicApi';
import { ErrorState } from '../components/common/ErrorState';
import { SkeletonTrackRow } from '../components/common/Skeleton';
import { TrackList } from '../components/common/TrackList';
import { useChart } from '../hooks/useMusicApi';
import { usePlayer } from '../store/playerStore';

const PERIODS: Array<{ value: ChartPeriod; label: string }> = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

/** Classement des titres les plus écoutés : semaine, mois ou année. */
export function ChartsView() {
  const [period, setPeriod] = useState<ChartPeriod>('week');
  const { data: tracks, loading, error, notFound, retry } = useChart(period);
  const playTrack = usePlayer((s) => s.playTrack);

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Classement</h1>
          <p className="mt-1 text-sm text-muted">Les sons les plus écoutés sur Mixify</p>
        </div>
        {tracks && tracks.length > 0 && (
          <button
            type="button"
            onClick={() => void playTrack(tracks[0], tracks)}
            className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-contrast transition hover:brightness-110"
          >
            <Play size={16} fill="currentColor" />
            Tout lire
          </button>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Période du classement"
        className="mb-5 flex gap-1 rounded-full bg-card p-1"
      >
        {PERIODS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={period === item.value}
            onClick={() => setPeriod(item.value)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              period === item.value ? 'bg-primary text-primary-contrast' : 'text-subtle hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="overflow-hidden rounded-card bg-card">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTrackRow key={i} />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Classement indisponible"
          error={error}
          notFound={notFound}
          onRetry={retry}
        />
      )}

      {!loading && !error && tracks && tracks.length === 0 && (
        <div className="rounded-card bg-card px-4 py-10 text-center">
          <TrendingUp size={28} className="mx-auto mb-3 text-muted" />
          <p className="text-sm font-semibold text-white">Pas encore de classement</p>
          <p className="mt-1 text-xs text-muted">
            Les titres apparaîtront ici dès que la communauté les aura écoutés.
          </p>
        </div>
      )}

      {!loading && !error && tracks && tracks.length > 0 && (
        <div className="rounded-card bg-card p-2">
          <TrackList tracks={tracks} numbered />
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-muted">
        Classement établi à partir des écoutes réelles des auditeurs.
      </p>
    </div>
  );
}
