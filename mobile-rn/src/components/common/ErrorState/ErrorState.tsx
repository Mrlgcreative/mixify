import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme/theme';
import { T } from '../T/T';

interface ErrorStateProps {
  title: string;
  error?: string | null;
  onRetry?: () => void;
  notFound?: boolean;
  children?: ReactNode;
}

/** Carte d'erreur ou d'absence de contenu, avec réessai. */
export function ErrorState({ title, error, onRetry, notFound, children }: ErrorStateProps) {
  return (
    <View style={styles.card}>
      <T weight="bold" style={{ fontSize: 17 }}>
        {notFound ? 'Contenu introuvable' : title}
      </T>
      <T color={colors.muted} style={{ fontSize: 13, marginTop: 6, lineHeight: 19 }}>
        {notFound
          ? 'Ce contenu n’existe pas ou n’est plus disponible.'
          : error ?? 'Une erreur est survenue.'}
      </T>
      {children}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 14 }}>
            Réessayer
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 20,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  button: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
});
