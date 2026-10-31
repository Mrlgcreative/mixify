import { StyleSheet, View } from 'react-native';

import { T } from '@/components/common/T/T';
import { formatDuration } from '@/lib/format';
import { colors, radius } from '@/theme/theme';
import type { ArtistStats } from '@/types/music';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <T weight="extrabold" style={styles.statValue}>
        {value}
      </T>
      <T color={colors.muted} style={styles.statLabel}>
        {label}
      </T>
    </View>
  );
}

/** Écoutes du catalogue sur 30 jours et top des morceaux. */
export function ListeningStats({ stats }: { stats: ArtistStats }) {
  const max = Math.max(1, ...stats.daily.map((day) => day.plays));
  const top = stats.tracks.filter((track) => track.plays > 0).slice(0, 5);

  return (
    <View style={styles.section}>
      <T weight="bold" style={styles.title}>
        Statistiques d’écoute
      </T>
      <T color={colors.muted} style={styles.subtitle}>
        Écoutes du catalogue Mixify, 30 derniers jours.
      </T>

      <View style={styles.stats}>
        <Stat label="Écoutes" value={stats.totals.plays} />
        <Stat label="Auditeurs" value={stats.totals.uniqueListeners} />
        <Stat label="Favoris" value={stats.totals.favorites} />
        <Stat label="Temps d’écoute" value={formatDuration(stats.totals.listeningMs)} />
      </View>

      <View style={styles.chartCard}>
        <View
          accessibilityRole="image"
          accessibilityLabel={`Écoutes par jour sur 30 jours, ${stats.totals.plays} au total`}
          style={styles.chart}
        >
          {stats.daily.map((day) => (
            <View
              key={day.date}
              style={[
                styles.bar,
                {
                  height: `${Math.round((day.plays / max) * 100)}%`,
                  minHeight: day.plays > 0 ? 3 : 1,
                },
              ]}
            />
          ))}
        </View>
        <T color={colors.muted} style={styles.chartNote}>
          {stats.totals.tracks} morceau(x) · {stats.totals.published} publié(s) ·{' '}
          {stats.totals.playlistAdds} ajout(s) en playlist
        </T>
      </View>

      {top.length > 0 ? (
        <View style={styles.topList}>
          {top.map((track, index) => (
            <View key={track.id} style={styles.topRow}>
              <T weight="bold" color={colors.muted} style={styles.rank}>
                {index + 1}
              </T>
              <T numberOfLines={1} style={{ fontSize: 12, flex: 1 }}>
                {track.title}
              </T>
              <T weight="semibold" style={{ fontSize: 11 }}>
                {track.plays} écoute{track.plays > 1 ? 's' : ''}
              </T>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 28 },
  title: { fontSize: 18 },
  subtitle: { fontSize: 11, marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 90,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    padding: 14,
  },
  statValue: { fontSize: 19 },
  statLabel: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 3 },
  chartCard: {
    marginTop: 10,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    padding: 14,
  },
  chart: { height: 80, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: 'rgba(243,194,75,0.7)' },
  chartNote: { fontSize: 10, marginTop: 8 },
  topList: { marginTop: 10, borderRadius: radius.panel, backgroundColor: colors.card, overflow: 'hidden' },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rank: { width: 16, fontSize: 10 },
});
