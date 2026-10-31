import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { T } from '@/components/common/T/T';
import { formatListening } from '@/lib/format';
import { computeProfileStats } from '@/lib/profileStats';
import type { AsyncState } from '@/lib/useAsync';
import { colors, radius } from '@/theme/theme';
import type { HistoryEntry, Library } from '@/types/music';

/** Onglet Statistiques : agrégats de l'historique et des favoris. */
export function StatsTab({
  history,
  library,
}: {
  history: AsyncState<HistoryEntry[]>;
  library: AsyncState<Library>;
}) {
  if (history.loading && !history.data) return <Loading label="Calcul des statistiques…" />;
  if (history.error) {
    return (
      <ErrorState
        title="Statistiques indisponibles"
        error={history.error}
        onRetry={history.retry}
      />
    );
  }

  const entries = history.data ?? [];
  const stats = computeProfileStats(entries);
  const liked = library.data?.liked.length ?? 0;

  const cards = [
    { label: 'Écoutes', value: String(stats.plays) },
    { label: 'Temps d’écoute', value: formatListening(stats.listeningMs) },
    { label: 'Artistes', value: String(stats.uniqueArtists) },
    { label: 'Titres distincts', value: String(stats.uniqueTracks) },
    { label: '7 derniers jours', value: String(stats.last7Days) },
    { label: 'Favoris', value: String(liked) },
  ];

  return (
    <View>
      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={styles.card}>
            <T color={colors.muted} style={{ fontSize: 10 }}>
              {card.label}
            </T>
            <T weight="extrabold" style={{ fontSize: 18, marginTop: 3 }}>
              {card.value}
            </T>
          </View>
        ))}
      </View>

      {entries.length === 0 ? (
        <T color={colors.muted} style={styles.empty}>
          Les statistiques apparaîtront dès vos premières écoutes.
        </T>
      ) : (
        <View style={styles.lists}>
          <TopList title="Artistes les plus écoutés" rows={stats.topArtists} />
          <TopList title="Genres les plus écoutés" rows={stats.topGenres} />
        </View>
      )}
    </View>
  );
}

function TopList({ title, rows }: { title: string; rows: Array<{ name: string; plays: number }> }) {
  const max = rows[0]?.plays ?? 1;
  return (
    <View>
      <T weight="bold" style={{ fontSize: 15, marginBottom: 10 }}>
        {title}
      </T>
      {rows.length === 0 ? (
        <T color={colors.muted} style={{ fontSize: 11 }}>
          Pas encore assez de données.
        </T>
      ) : (
        rows.map((row) => (
          <View key={row.name} style={{ marginBottom: 10 }}>
            <View style={styles.topRow}>
              <T numberOfLines={1} style={{ fontSize: 12, flex: 1 }}>
                {row.name}
              </T>
              <T color={colors.muted} style={{ fontSize: 10 }}>
                {row.plays} écoute(s)
              </T>
            </View>
            <View style={styles.barBg}>
              <View
                style={[
                  styles.bar,
                  { width: `${Math.max(4, (row.plays / max) * 100)}%` },
                ]}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 12,
  },
  empty: { fontSize: 12, marginTop: 16 },
  lists: { marginTop: 24, gap: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  barBg: { height: 6, borderRadius: 3, backgroundColor: colors.elevated, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
