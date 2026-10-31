import { useRouter } from 'expo-router';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/theme';
import { T } from '../T/T';

/** En-tête des écrans poussés : retour + titre, sous l'encoche. */
export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
      >
        {router.canGoBack() ? (
          <ChevronLeft size={21} color={colors.text} />
        ) : (
          <ChevronDown size={21} color={colors.text} />
        )}
      </Pressable>
      <T weight="bold" numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </T>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: colors.panel,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, flex: 1 },
});
