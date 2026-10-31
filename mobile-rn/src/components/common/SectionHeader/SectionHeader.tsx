import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/theme';
import { T } from '../T/T';

/** Titre de rayon : titre + sous-titre, comme les sections du web. */
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <T weight="bold" style={{ fontSize: 20, letterSpacing: -0.3 }}>
        {title}
      </T>
      {subtitle ? (
        <T color={colors.muted} style={{ fontSize: 12, marginTop: 2 }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 26, marginBottom: 12 },
});
