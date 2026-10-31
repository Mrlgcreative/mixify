import { Image, StyleSheet } from 'react-native';

import noise from '../../../assets/glass-noise.png';

/** Grain fin posé sur le verre des capsules (texture statique). */
export function GlassNoise() {
  return (
    <Image
      alt=""
      pointerEvents="none"
      accessible={false}
      source={noise}
      resizeMode="cover"
      style={[StyleSheet.absoluteFill, styles.noise]}
    />
  );
}

const styles = StyleSheet.create({
  noise: { opacity: 0.05 },
});
