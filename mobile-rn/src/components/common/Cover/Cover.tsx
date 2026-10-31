import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/theme';
import { T } from '../T/T';

interface CoverProps {
  /** Graine : même id => même dégradé. */
  seed: string;
  title?: string;
  imageUrl?: string;
  size?: number;
  /** Rayon explicite, sinon coins de carte. */
  round?: number;
  textSize?: number;
}

function hues(seed: string): { hue: number; hue2: number } {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }
  const hue = hash % 360;
  return { hue, hue2: (hue + 48) % 360 };
}

/** Teintes d'ambiance d'une pochette générative. */
export const coverHues = hues;

function initials(value: string): string {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/** Pochette : image réelle, sinon dégradé déterministe + initiales. */
export function Cover({ seed, title, imageUrl, size = 48, round = 10, textSize }: CoverProps) {
  const [failed, setFailed] = useState(false);
  const { hue, hue2 } = hues(seed);
  const box = { width: size, height: size, borderRadius: round };

  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        alt={title ?? ''}
        cachePolicy="memory-disk"
        contentFit="cover"
        transition={120}
        onError={() => setFailed(true)}
        style={[box, { backgroundColor: colors.elevated }]}
      />
    );
  }

  return (
    <LinearGradient
      colors={[`hsl(${hue}, 62%, 42%)`, `hsl(${hue2}, 55%, 18%)`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[box, styles.center]}
    >
      <T
        weight="bold"
        numberOfLines={1}
        style={[styles.initials, textSize ? { fontSize: textSize } : undefined]}
      >
        {initials(title ?? '')}
      </T>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontSize: 18, color: 'rgba(255,255,255,0.9)', paddingHorizontal: 2 },
});
