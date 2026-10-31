import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/theme';

/** Bloc gris d'un état de chargement. */
export function Skeleton({
  width,
  height,
  radius = 8,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
}) {
  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius: radius },
      ]}
    />
  );
}

/** Ligne de morceau en attente : pochette, titre, sous-titre. */
export function SkeletonTrackRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={44} height={44} radius={6} />
      <View style={styles.texts}>
        <Skeleton width="58%" height={12} radius={4} />
        <Skeleton width="34%" height={10} radius={4} />
      </View>
    </View>
  );
}

/** Liste de lignes grises, affichée à la place d'un spinner. */
export function SkeletonList({ rows = 6, label = 'Chargement…' }: { rows?: number; label?: string }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.list, { opacity }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonTrackRow key={index} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.elevated, opacity: 0.7 },
  list: { gap: 18, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  texts: { flex: 1, gap: 7 },
});
