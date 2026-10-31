import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme/theme';

const CELL = 64;

/** Fond d'ambiance du web : quadrillage discret + halos or/bleu. */
export function GridBackground() {
  const { width, height } = useWindowDimensions();
  const columns = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['rgba(243,194,75,0.11)', 'rgba(243,194,75,0)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ position: 'absolute', top: -height * 0.2, left: -width * 0.3, width: width * 1.4, height: height * 0.9 }}
      />
      <LinearGradient
        colors={['rgba(56,163,224,0.08)', 'rgba(56,163,224,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.3, y: 0.8 }}
        style={{ position: 'absolute', top: -height * 0.1, right: -width * 0.4, width: width * 1.2, height: height * 0.7 }}
      />
      {Array.from({ length: columns }).map((_, index) => (
        <View
          key={`c${index}`}
          style={{ position: 'absolute', top: 0, bottom: 0, left: index * CELL, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(45,45,50,0.5)' }}
        />
      ))}
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={`r${index}`}
          style={{ position: 'absolute', left: 0, right: 0, top: index * CELL, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(45,45,50,0.5)' }}
        />
      ))}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.35 }]} />
    </View>
  );
}
