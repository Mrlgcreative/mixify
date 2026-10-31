import { ChevronLeft, Headphones, Mic2, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { T } from '@/components/common/T/T';
import { colors, radius } from '@/theme/theme';
import type { AccountRole } from '@/types/auth';

/** Deuxième étape : le choix du type de compte, avant toute authentification. */
export function RoleStep({
  onSelect,
  onBack,
}: {
  onSelect: (role: AccountRole) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        hitSlop={8}
        style={styles.back}
      >
        <ChevronLeft size={16} color={colors.subtle} />
        <T color={colors.subtle} style={{ fontSize: 13 }}>
          Retour
        </T>
      </Pressable>

      <View style={styles.content}>
        <T color={colors.primary} weight="semibold" style={styles.kicker}>
          Ton profil
        </T>
        <T weight="extrabold" style={styles.title}>
          Es-tu artiste ?
        </T>
        <T color={colors.muted} style={styles.subtitle}>
          Choisis l’espace qui correspond à ton compte. L’authentification sera adaptée à ton
          choix.
        </T>

        <View style={styles.cards}>
          <RoleCard
            icon={Mic2}
            title="Oui, je suis artiste"
            text="Publie tes morceaux, gère ton profil public et suis tes écoutes."
            onPress={() => onSelect('artiste')}
          />
          <RoleCard
            icon={Headphones}
            title="Non, je suis auditeur"
            text="Écoute le catalogue, ajoute des favoris et crée tes playlists."
            onPress={() => onSelect('utilisateur')}
          />
        </View>
      </View>

      <T color={colors.muted} style={styles.note}>
        Les artistes peuvent aussi écouter, mettre en favori et créer des playlists.
      </T>
    </ScrollView>
  );
}

function RoleCard({
  icon: Icon,
  title,
  text,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={text}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.icon}>
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <T weight="bold" style={{ fontSize: 15 }}>
          {title}
        </T>
        <T color={colors.muted} style={styles.cardText}>
          {text}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    paddingVertical: 10,
  },
  content: { flex: 1, justifyContent: 'center', paddingVertical: 24 },
  kicker: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontSize: 30, letterSpacing: -0.8, marginTop: 6 },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 360 },
  cards: { gap: 12, marginTop: 26 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardPressed: { borderColor: colors.primary, opacity: 0.9 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,194,75,0.12)',
  },
  cardText: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  note: { fontSize: 10, textAlign: 'center', lineHeight: 15 },
});
