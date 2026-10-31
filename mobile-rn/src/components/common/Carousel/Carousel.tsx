import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/theme';
import { T } from '../T/T';

interface CarouselProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Rayon horizontal défilant, comme `Carousel` sur le web. */
export function Carousel({ title, subtitle, children }: CarouselProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <T weight="bold" style={styles.title}>
          {title}
        </T>
        {subtitle ? (
          <T color={colors.muted} style={styles.subtitle}>
            {subtitle}
          </T>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        decelerationRate="fast"
        snapToInterval={164}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26 },
  header: { marginBottom: 12 },
  title: { fontSize: 20, letterSpacing: -0.3 },
  subtitle: { fontSize: 12, marginTop: 2 },
  row: { paddingRight: 16 },
});
