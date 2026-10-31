import { BadgeCheck, Pause, Play } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/theme';
import { Cover } from '../Cover/Cover';
import { T } from '../T/T';

interface MediaCardProps {
  title: string;
  subtitle?: string;
  seed: string;
  shape?: 'square' | 'circle';
  onPlay?: () => void;
  onSelect?: () => void;
  playing?: boolean;
  imageUrl?: string;
  verified?: boolean;
  width?: number;
}

/** Carte d'album / playlist / artiste (grille ou carrousel), comme sur le web. */
export function MediaCard({
  title,
  subtitle,
  seed,
  shape = 'square',
  onPlay,
  onSelect,
  playing = false,
  imageUrl,
  verified = false,
  width = 152,
}: MediaCardProps) {
  return (
    <Pressable
      accessibilityRole={onSelect ? 'button' : undefined}
      accessibilityLabel={title}
      onPress={onSelect}
      style={({ pressed }) => [styles.wrap, { width }, pressed && onSelect ? { opacity: 0.85 } : null]}
    >
      <View>
        <Cover
          seed={seed}
          title={title}
          imageUrl={imageUrl}
          size={width}
          round={shape === 'circle' ? width / 2 : 10}
          textSize={28}
        />
        {onPlay ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${playing ? 'Pause' : 'Lecture'} : ${title}`}
            onPress={onPlay}
            style={({ pressed }) => [styles.play, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            {playing ? (
              <Pause size={16} color={colors.primaryContrast} fill={colors.primaryContrast} />
            ) : (
              <Play size={16} color={colors.primaryContrast} fill={colors.primaryContrast} style={{ marginLeft: 2 }} />
            )}
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.meta, shape === 'circle' && { alignItems: 'center' }]}>
        <View style={styles.titleRow}>
          <T weight="semibold" numberOfLines={1} style={styles.title}>
            {title}
          </T>
          {verified ? <BadgeCheck size={14} color={colors.primary} style={{ marginLeft: 4 }} /> : null}
        </View>
        {subtitle ? (
          <T color={colors.muted} numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </T>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginRight: 12 },
  play: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  meta: { marginTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 13, flexShrink: 1 },
  subtitle: { fontSize: 11, marginTop: 2 },
});
