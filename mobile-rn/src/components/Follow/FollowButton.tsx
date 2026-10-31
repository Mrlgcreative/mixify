import { Check, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { useFollows } from '@/store/follows';
import { colors } from '@/theme/theme';
import type { Artist } from '@/types/music';
import { T } from '../common/T/T';

/** Bouton Suivre / Abonné, comme sur les cartes artiste du web. */
export function FollowButton({ artist, compact = false }: { artist: Artist; compact?: boolean }) {
  const { isFollowing, toggleFollow } = useFollows();
  const following = isFollowing(artist.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      onPress={() => void toggleFollow(artist)}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        following ? styles.following : styles.notFollowing,
        pressed && { opacity: 0.8 },
      ]}
    >
      {following ? (
        <Check size={13} color={colors.subtle} />
      ) : (
        <Plus size={13} color={colors.primaryContrast} />
      )}
      <T
        weight="semibold"
        color={following ? colors.subtle : colors.primaryContrast}
        style={{ fontSize: compact ? 10 : 12 }}
      >
        {following ? 'Abonné' : 'Suivre'}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  compact: { paddingHorizontal: 9, paddingVertical: 4 },
  notFollowing: { backgroundColor: colors.primary },
  following: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.elevated },
});
