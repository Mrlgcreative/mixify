import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  Share,  // native share sheet (pour confirmer le résultat)
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatTime } from '@/lib/format';
import { useLibraryStore } from '@/store/library';
import { usePlayer, usePlayerProgress } from '@/store/player';
import { colors, PUBLIC_URL, radius } from '@/theme/theme';
import { Cover, coverHues } from '../common/Cover/Cover';
import { ProgressBar } from '../common/ProgressBar/ProgressBar';
import { T } from '../common/T/T';
import { shareTrackToWhatsApp } from '@/utils/whatsAppShare';

/** Lecteur plein écran (Now Playing), ouvert depuis le mini-lecteur. */
export function NowPlaying() {
  const router = useRouter();
  // Ouvert par lien profond, il n'y a rien derrière : on retombe sur l'accueil.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    current,
    queue,
    isPlaying,
    shuffle,
    repeat,
    loading,
    mixing,
    toggle,
    next,
    previous,
    seek,
    toggleShuffle,
    cycleRepeat,
    playTrack,
  } = usePlayer();
  const { favorites, toggleFavorite } = useLibraryStore();
  const [queueOpen, setQueueOpen] = useState(false);

  // Sans Modal natif, le bouton retour doit fermer le panneau avant l'écran.
  useEffect(() => {
    if (!queueOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setQueueOpen(false);
      return true;
    });
    return () => subscription.remove();
  }, [queueOpen]);

  if (!current) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <T weight="bold" style={{ fontSize: 18 }}>
          Aucun titre en lecture
        </T>
        <Pressable onPress={close} style={styles.closeButton}>
          <T weight="semibold" color={colors.bg} style={{ fontSize: 14 }}>
            Retour
          </T>
        </Pressable>
      </View>
    );
  }

  const cover = Math.min(width - 72, 320);
  const liked = Boolean(favorites[current.id]);
  const RepeatIcon = repeat === 'one' ? Repeat1 : Repeat;
  const upNext = queue.filter((track) => track.id !== current.id);
  const { hue } = coverHues(current.id);

  // Partage audio vers WhatsApp via l'API backend (token côté serveur)
  const shareToWhatsApp = async (track: any) => {
    const result = await shareTrackToWhatsApp({
      audioUrl: track.audio_url,
      title: track.title,
      artist: track.artist?.name || track.artist || '',
      to: '+243812345678', // à remplacer par l'ID du destinataire
      phoneNumberId: process.env.EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || '',
    });
    return result;
  };

  const share = async () => {
    if (!current) return;
    const result = await shareToWhatsApp(current);
    if (result.success) {
      // Succès : on peut ouvrir le sheet de partage pour confirmer
      Share.share({
        message: `Partage WhatsApp envoyé pour ${current.title}`,
      });
    } else {
      Share.share({
        message: `Erreur: ${result.error}`,
      });
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`hsl(${hue}, 45%, 22%)`, colors.bg]}
        locations={[0, 0.6]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le lecteur"
          onPress={close}
          style={styles.headerButton}
        >
          <ChevronDown size={22} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <T
            color={mixing ? colors.primary : colors.muted}
            weight="semibold"
            style={styles.headerLabel}
          >
            {mixing ? 'Mixage' : 'En lecture'}
          </T>
          <T numberOfLines={1} style={styles.headerAlbum}>
            {current.album?.title ?? 'Mixify'}
          </T>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Cover
            seed={current.id}
            title={current.title}
            imageUrl={current.album?.coverUrl ?? current.coverUrl}
            size={cover}
            round={16}
            textSize={52}
          />
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="extrabold" numberOfLines={1} style={styles.title}>
              {current.title}
            </T>
            <T color={colors.muted} numberOfLines={1} style={styles.artist}>
              {current.artist.name}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            accessibilityState={{ selected: liked }}
            onPress={() => void toggleFavorite(current.id)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Heart
              size={22}
              color={liked ? colors.primary : colors.muted}
              fill={liked ? colors.primary : 'none'}
            />
          </Pressable>
        </View>

        <PlaybackProgress onSeek={seek} />

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lecture aléatoire"
            accessibilityState={{ selected: shuffle }}
            onPress={toggleShuffle}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Shuffle size={22} color={shuffle ? colors.primary : colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Titre précédent"
            onPress={previous}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <SkipBack size={30} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Chargement' : isPlaying ? 'Mettre en pause' : 'Lire'}
            accessibilityState={{ busy: loading }}
            onPress={toggle}
            style={({ pressed }) => [styles.play, pressed && styles.playPressed]}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : isPlaying ? (
              <Pause size={30} color={colors.bg} fill={colors.bg} />
            ) : (
              <Play
                size={30}
                color={colors.bg}
                fill={colors.bg}
                style={{ marginLeft: 3 }}
              />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Titre suivant"
            onPress={next}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <SkipForward size={30} color={colors.text} fill={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Répétition"
            accessibilityState={{ selected: repeat !== 'off' }}
            onPress={cycleRepeat}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <RepeatIcon
              size={22}
              color={repeat === 'off' ? colors.text : colors.primary}
            />
          </Pressable>
        </View>

        <View style={styles.bottomActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Partager ce titre sur WhatsApp"
            onPress={() => void share()}
            style={({ pressed }) => [styles.bottomButton, pressed && styles.pressed]}
          >
            <Share2 size={20} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`File d'attente, ${upNext.length} titre${upNext.length > 1 ? 's' : ''} en attente`}
            onPress={() => setQueueOpen(true)}
            style={({ pressed }) => [styles.bottomButton, pressed && styles.pressed]}
          >
            <ListMusic size={20} color={colors.text} />
          </Pressable>
        </View>
      </ScrollView>

      {queueOpen ? (
        <View style={[styles.sheetBackdrop, { top: -insets.top }]} accessibilityViewIsModal>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() => setQueueOpen(false)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 14 }]}>
            <View style={styles.queueHeader}>
              <ListMusic size={16} color={colors.primary} />
              <T weight="bold" style={{ fontSize: 15 }}>
                À suivre
              </T>
              <View style={{ flex: 1 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer la file d'attente"
                hitSlop={10}
                onPress={() => setQueueOpen(false)}
              >
                <ChevronDown size={20} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {upNext.length === 0 ? (
                <T color={colors.muted} style={{ fontSize: 13 }}>
                  Aucun titre en attente.
                </T>
              ) : (
                upNext.map((track) => (
                  <Pressable
                    key={track.id}
                    onPress={() => {
                      playTrack(track, queue);
                      setQueueOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.queueRow,
                      pressed && { backgroundColor: colors.elevated },
                    ]}
                  >
                    <Cover
                      seed={track.id}
                      title={track.title}
                      imageUrl={track.album?.coverUrl ?? track.coverUrl}
                      size={38}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T numberOfLines={1} style={{ fontSize: 13 }}>
                        {track.title}
                      </T>
                      <T color={colors.muted} numberOfLines={1} style={{ fontSize: 11 }}>
                        {track.artist.name}
                      </T>
                    </View>
                    <Play size={14} color={colors.muted} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Seule la progression se re-rend au tick du lecteur, pas tout l'écran. */
function PlaybackProgress({ onSeek }: { onSeek: (seconds: number) => void }) {
  const { position, duration } = usePlayerProgress();
  return (
    <View style={styles.progress}>
      <ProgressBar value={position} max={duration} onChange={onSeek} />
      <View style={styles.times}>
        <T color={colors.muted} style={styles.time}>
          {formatTime(position)}
        </T>
        <T color={colors.muted} style={styles.time}>
          -{formatTime(Math.max(0, duration - position))}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.bg },
  closeButton: {
    borderRadius: 999,
    backgroundColor: colors.text,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  headerAlbum: { fontSize: 12, maxWidth: 220 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 40,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    marginTop: 26,
  },
  cover: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  title: { fontSize: 24, letterSpacing: -0.5 },
  artist: { fontSize: 14, marginTop: 3 },
  progress: { width: '100%', marginTop: 18 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  time: { fontSize: 10, fontVariant: ['tabular-nums'] },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.55 },
  skipButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-end',
    marginTop: 14,
  },
  bottomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.elevated,
  },
  play: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPressed: { transform: [{ scale: 0.94 }] },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
    elevation: 24,
  },
  sheet: {
    maxHeight: '62%',
    borderTopLeftRadius: radius.panel,
    borderTopRightRadius: radius.panel,
    backgroundColor: colors.panel,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetList: { flexGrow: 0 },
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
});
