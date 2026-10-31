import { ArrowRight, AudioLines, ChevronLeft, Heart, Mic2, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/common/Logo/Logo';
import { T } from '@/components/common/T/T';
import { colors, radius } from '@/theme/theme';

interface Slide {
  icon: LucideIcon;
  kicker: string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: AudioLines,
    kicker: 'Bienvenue sur Mixify',
    title: 'Écoute sans coupure',
    text: 'Le catalogue indépendant, en entier : le lecteur enchaîne tes morceaux sans intermédiaire.',
  },
  {
    icon: Heart,
    kicker: 'Ta musique',
    title: 'Tes favoris et playlists',
    text: 'Ils te suivent sur tous tes appareils.',
  },
  {
    icon: Mic2,
    kicker: 'Pour les artistes',
    title: 'Artiste ? Publie ici',
    text: 'Gère ton catalogue et suis tes écoutes.',
  },
];

/** Première étape : trois écrans d'intro, puis le choix du profil. */
export function WelcomeStep({ onStart }: { onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const Icon = slide.icon;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      setIndex((current) => current - 1);
      return true;
    });
    return () => subscription.remove();
  }, [index]);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {index === 0 ? (
          <Logo />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Écran précédent"
            onPress={() => setIndex((current) => current - 1)}
            hitSlop={8}
            style={styles.back}
          >
            <ChevronLeft size={16} color={colors.subtle} />
            <T color={colors.subtle} style={{ fontSize: 13 }}>
              Retour
            </T>
          </Pressable>
        )}
        {!isLast && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passer l’introduction"
            onPress={onStart}
            hitSlop={8}
          >
            <T color={colors.muted} style={{ fontSize: 13 }}>
              Passer
            </T>
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        <View style={styles.icon}>
          <Icon size={34} color={colors.primary} />
        </View>
        <T color={colors.primary} weight="semibold" style={styles.kicker}>
          {slide.kicker}
        </T>
        <T weight="extrabold" style={styles.title}>
          {slide.title}
        </T>
        <T color={colors.muted} style={styles.subtitle}>
          {slide.text}
        </T>
      </View>

      <View style={styles.footer}>
        <View
          accessible
          accessibilityLabel={`Étape ${index + 1} sur ${SLIDES.length}`}
          style={styles.dots}
        >
          {SLIDES.map((item, dotIndex) => (
            <View
              key={item.title}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => (isLast ? onStart() : setIndex((current) => current + 1))}
          style={({ pressed }) => [styles.start, pressed && { opacity: 0.85 }]}
        >
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 14 }}>
            {isLast ? 'Commencer' : 'Suivant'}
          </T>
          <ArrowRight size={17} color={colors.primaryContrast} />
        </Pressable>
      </View>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    paddingVertical: 8,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 10 },
  hero: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  icon: {
    width: 84,
    height: 84,
    borderRadius: radius.panel,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243,194,75,0.12)',
  },
  kicker: { fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 24 },
  title: { fontSize: 30, letterSpacing: -0.8, marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 360 },
  footer: { gap: 16 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { width: 20, backgroundColor: colors.primary },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
  },
});
