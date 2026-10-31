import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/theme';
import { T } from '../T/T';

/** Proportions du symbole, sur une grille de 256 (identiques au web et à l'icône). */
const BAR = 48 / 256;
const GAP = 32 / 256;
const HEIGHTS = [112 / 256, 176 / 256, 136 / 256] as const;

/** Logo Mixify : trois barres d'égaliseur centrées sur un même axe. */
export function Logo({ size = 26, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  const bar = size * BAR;
  return (
    <View style={styles.row}>
      <View style={[styles.bars, { width: size, height: size, gap: size * GAP }]}>
        {HEIGHTS.map((height) => (
          <View
            key={height}
            style={{ width: bar, height: size * height, borderRadius: bar / 2, backgroundColor: colors.primary }}
          />
        ))}
      </View>
      {withWordmark ? (
        <T weight="bold" style={{ fontSize: 20, letterSpacing: -0.4 }}>
          Mixify
        </T>
      ) : null}
    </View>
  );
}

/** Variante carrée du symbole, pour les écrans d'accueil. */
export function LogoMark({ size = 64 }: { size?: number }) {
  const mark = size * 0.78;
  const bar = mark * BAR;
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.primary },
      ]}
    >
      <View style={[styles.bars, { width: mark, height: mark, gap: mark * GAP }]}>
        {HEIGHTS.map((height) => (
          <View
            key={height}
            style={{
              width: bar,
              height: mark * height,
              borderRadius: bar / 2,
              backgroundColor: colors.primaryContrast,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  mark: { alignItems: 'center', justifyContent: 'center' },
});
