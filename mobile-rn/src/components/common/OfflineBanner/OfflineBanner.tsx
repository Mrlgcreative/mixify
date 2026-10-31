import { WifiOff } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/lib/network';
import { colors } from '@/theme/theme';
import { T } from '../T/T';

/** Bandeau discret : les écrans continuent d'afficher le cache. */
export function OfflineBanner() {
  const { online } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (online) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <View style={styles.pill}>
        <WifiOff size={12} color={colors.primaryContrast} />
        <T weight="semibold" color={colors.primaryContrast} style={styles.label}>
          Hors ligne · contenu en cache
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  label: { fontSize: 10 },
});
