import { Play, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getChart } from '@/api/musicApi';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { useAsync } from '@/lib/useAsync';
import { usePlayer } from '@/store/player';
import { colors } from '@/theme/theme';

type Period = 'week' | 'month' | 'year';

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
];

/** Classement des titres les plus écoutés : semaine, mois ou année. */
export function Charts() {
  const [period, setPeriod] = useState<Period>('week');
  const { data: tracks, loading, error, retry } = useAsync('chart', () => getChart(period), [period]);
  const { playTrack } = usePlayer();

  return (
    <Screen>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={styles.title}>
            Classement
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            Les sons les plus écoutés sur Mixify
          </T>
        </View>
        {tracks && tracks.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => playTrack(tracks[0], tracks)}
            style={({ pressed }) => [styles.playAll, pressed && { opacity: 0.85 }]}
          >
            <Play size={15} color={colors.primaryContrast} fill={colors.primaryContrast} />
            <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
              Tout lire
            </T>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.periods}>
        {PERIODS.map((item) => {
          const active = period === item.value;
          return (
            <Pressable
              key={item.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setPeriod(item.value)}
              style={[styles.period, active && styles.periodActive]}
            >
              <T
                weight="semibold"
                color={active ? colors.primaryContrast : colors.subtle}
                style={{ fontSize: 13 }}
              >
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      {loading ? <Loading label="Chargement du classement…" /> : null}

      {!loading && error ? (
        <ErrorState title="Classement indisponible" error={error} onRetry={retry} />
      ) : null}

      {!loading && !error && tracks && tracks.length === 0 ? (
        <View style={styles.empty}>
          <TrendingUp size={28} color={colors.muted} />
          <T weight="semibold" style={{ fontSize: 14 }}>
            Pas encore de classement
          </T>
          <T color={colors.muted} style={styles.emptyText}>
            Les titres apparaîtront ici dès que la communauté les aura écoutés.
          </T>
        </View>
      ) : null}

      {!loading && !error && tracks && tracks.length > 0 ? (
        <View style={styles.list}>
          <TrackList tracks={tracks} numbered />
        </View>
      ) : null}

      <T color={colors.muted} style={styles.footerNote}>
        Classement établi à partir des écoutes réelles des auditeurs.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 12, marginBottom: 18 },
  title: { fontSize: 22 },
  subtitle: { fontSize: 12, marginTop: 3 },
  playAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  periods: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  period: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  periodActive: { backgroundColor: colors.primary },
  empty: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyText: { fontSize: 11, textAlign: 'center' },
  list: { backgroundColor: colors.card, borderRadius: 10, padding: 6 },
  footerNote: { fontSize: 10, textAlign: 'center', marginTop: 16 },
});
