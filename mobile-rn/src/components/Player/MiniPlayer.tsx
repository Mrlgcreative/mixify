import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { TabBarBlurTarget } from '@/components/MobileNav/TabBarScrollContext';
import { usePlayer, usePlayerProgress } from '@/store/player';
import { colors } from '@/theme/theme';
import { Cover } from '../common/Cover/Cover';
import { GlassNoise } from '../common/GlassNoise/GlassNoise';
import { T } from '../common/T/T';

/** Verre natif disponible : on allège le fond pour laisser voir le liquide. */
const liquidGlass = isLiquidGlassAvailable();

/** Mini-lecteur flottant au-dessus de la barre d'onglets. */
export function MiniPlayer({
  collapsed = false,
  onExpand,
  blurTarget,
}: {
  collapsed?: boolean;
  onExpand?: () => void;
  blurTarget?: TabBarBlurTarget | null;
}) {
  const router = useRouter();
  const {
    current,
    isPlaying,
    loading,
    shuffle,
    repeat,
    mixing,
    toggle,
    previous,
    next,
    toggleShuffle,
    cycleRepeat,
  } = usePlayer();

  if (!current) return null;
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;

  if (collapsed) {
    return (
      <View style={styles.compact}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le lecteur"
          onPressIn={onExpand}
          onPress={() => router.push('/now-playing')}
          style={({ pressed }) => [styles.compactInfo, pressed && styles.pressed]}
        >
          <Cover
            seed={current.id}
            title={current.title}
            imageUrl={current.album?.coverUrl ?? current.coverUrl}
            size={38}
            round={8}
            textSize={11}
          />
          <View style={styles.compactText}>
            <T weight="semibold" numberOfLines={1} style={styles.title}>
              {current.title}
            </T>
            <T
              color={mixing ? colors.primary : colors.muted}
              numberOfLines={1}
              style={styles.artist}
            >
              {mixing ? 'Mixage en cours' : current.artist.name}
            </T>
          </View>
        </Pressable>
        <View style={styles.compactControlSlot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Chargement' : isPlaying ? 'Mettre en pause' : 'Lire'}
            accessibilityState={{ busy: loading }}
            onPressIn={onExpand}
            onPress={toggle}
            style={({ pressed }) => [styles.compactControl, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : isPlaying ? (
              <Pause size={19} color={colors.text} fill={colors.text} />
            ) : (
              <Play
                size={19}
                color={colors.text}
                fill={colors.text}
                style={{ marginLeft: 2 }}
              />
            )}
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Titre suivant"
          onPressIn={onExpand}
          onPress={next}
          style={({ pressed }) => [styles.compactNext, pressed && styles.pressed]}
        >
          <SkipForward size={20} color={colors.text} fill={colors.text} />
        </Pressable>
        <View style={styles.compactTrack}>
          <MiniProgress />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, liquidGlass && styles.barGlass]}>
        {liquidGlass ? (
          <GlassView
            glassEffectStyle="regular"
            tintColor="rgba(28,28,30,0.22)"
            isInteractive
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <BlurView
            blurTarget={blurTarget ?? undefined}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={55}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <GlassNoise />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir le lecteur"
          onPress={() => router.push('/now-playing')}
          style={({ pressed }) => [styles.info, pressed && styles.pressed]}
        >
          <Cover
            seed={current.id}
            title={current.title}
            imageUrl={current.album?.coverUrl ?? current.coverUrl}
            size={40}
            textSize={12}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="semibold" numberOfLines={1} style={styles.title}>
              {current.title}
            </T>
            <T
              color={mixing ? colors.primary : colors.muted}
              numberOfLines={1}
              style={styles.artist}
            >
              {mixing ? 'Mixage en cours' : current.artist.name}
            </T>
          </View>
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lecture aléatoire"
            accessibilityState={{ selected: shuffle }}
            onPress={toggleShuffle}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Shuffle size={15} color={shuffle ? colors.primary : colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Titre précédent"
            onPress={previous}
            style={({ pressed }) => [styles.side, pressed && styles.pressed]}
          >
            <SkipBack size={17} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Chargement' : isPlaying ? 'Mettre en pause' : 'Lire'}
            accessibilityState={{ busy: loading }}
            onPress={toggle}
            style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.bg} />
            ) : isPlaying ? (
              <Pause size={17} color={colors.bg} fill={colors.bg} />
            ) : (
              <Play
                size={17}
                color={colors.bg}
                fill={colors.bg}
                style={{ marginLeft: 2 }}
              />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Titre suivant"
            onPress={next}
            style={({ pressed }) => [styles.side, pressed && styles.pressed]}
          >
            <SkipForward size={17} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Répétition"
            accessibilityState={{ selected: repeat !== 'off' }}
            onPress={cycleRepeat}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <RepeatIcon size={15} color={repeat === 'off' ? colors.text : colors.primary} />
          </Pressable>
        </View>
        <View style={styles.track}>
          <MiniProgress />
        </View>
      </View>
    </View>
  );
}

/** Seul l'avancement se re-rend au tick du lecteur, pas toute la barre. */
function MiniProgress() {
  const { position, duration } = usePlayerProgress();
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  return <View style={[styles.progress, { width: `${progress * 100}%` }]} />;
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 6, paddingBottom: 8, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(28,28,30,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  barGlass: {
    backgroundColor: 'rgba(28,28,30,0.24)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  compact: {
    flex: 1,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  compactInfo: {
    flex: 1,
    minWidth: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactText: {
    flex: 1,
    minWidth: 0,
    height: 38,
    justifyContent: 'center',
  },
  compactControl: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactControlSlot: {
    width: 44,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactNext: {
    width: 34,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  action: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  side: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  control: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: { transform: [{ scale: 0.92 }] },
  pressed: { opacity: 0.5 },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progress: { height: 2, backgroundColor: colors.primary },
  title: { fontSize: 13 },
  artist: { fontSize: 11, marginTop: 1 },
});
