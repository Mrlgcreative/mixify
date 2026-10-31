import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getHome } from '@/api/musicApi';
import { Carousel } from '@/components/common/Carousel/Carousel';
import { Cover } from '@/components/common/Cover/Cover';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { MediaCard } from '@/components/common/MediaCard/MediaCard';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/store/auth';
import { usePlayer } from '@/store/player';
import { colors } from '@/theme/theme';
import { isArtist, isPlaylist, isTrack, type Shelf, type Track } from '@/types/music';

const HERO_INTERVAL_MS = 7000;

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Accueil : raccourcis, mix à la une et rayons, comme la vue web. */
export function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, retry } = useAsync('home', () => getHome());
  const { playTrack } = usePlayer();

  const heroQueue = useMemo(() => {
    const seen = new Set<string>();
    return (data?.shelves ?? [])
      .flatMap((shelf) => shelf.items)
      .filter(isTrack)
      .filter((track) => {
        if (seen.has(track.id)) return false;
        seen.add(track.id);
        return true;
      });
  }, [data]);
  const slides = useMemo(() => shuffle(heroQueue), [heroQueue]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % slides.length), HERO_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [paused, slides.length, index]);

  const goTo = (next: number) => {
    if (slides.length > 0) setIndex((next + slides.length) % slides.length);
  };

  if (loading) {
    return (
      <Screen>
        <Loading label="Chargement de l’accueil…" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState title="Accueil indisponible" error={error} onRetry={retry} />
      </Screen>
    );
  }

  const activeIndex = slides.length > 0 ? index % slides.length : 0;
  const hero = slides[activeIndex];
  const catalogShelf = data.shelves.find((shelf) => shelf.id === 'nouveautes');
  const catalogTracks = (catalogShelf?.items ?? []).filter(isTrack);
  const shortcuts = catalogTracks.slice(0, 6);

  return (
    <Screen>
      <T weight="extrabold" style={styles.greeting}>
        {data.greeting}
        {data.greeting && user?.name ? `, ${user.name.split(' ')[0]}` : ''}
      </T>

      {shortcuts.length > 0 ? (
        <View style={styles.shortcuts}>
          {shortcuts.map((track) => (
            <Shortcut key={track.id} track={track} onPlay={() => playTrack(track, catalogTracks)} />
          ))}
        </View>
      ) : null}

      <LinearGradient
        colors={['rgba(243,194,75,0.20)', colors.card, colors.panel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <Cover
            seed={hero?.id ?? 'mixify'}
            title={hero?.title ?? 'Mixify'}
            imageUrl={hero?.album?.coverUrl ?? hero?.coverUrl}
            size={150}
            round={14}
            textSize={34}
          />
          <View style={styles.heroInfo}>
            <T color={colors.primary} weight="semibold" style={styles.heroKicker}>
              {hero ? 'À la une' : 'Mixify'}
            </T>
            <T weight="extrabold" numberOfLines={2} style={styles.heroTitle}>
              {hero?.title ?? 'Ton mix du jour est prêt'}
            </T>
            <T color={colors.subtle} numberOfLines={2} style={styles.heroSubtitle}>
              {hero
                ? `${hero.artist.name}${hero.album?.title ? ` — ${hero.album.title}` : ''}`
                : 'Les artistes de Kolwezi et du Congo, réunis sur Mixify.'}
            </T>
            <T color={colors.muted} numberOfLines={2} style={styles.heroHint}>
              Enchaînement automatique, tempo aligné, transitions sans couture.
            </T>
            <Pressable
              accessibilityRole="button"
              disabled={!hero}
              onPress={() => hero && playTrack(hero, heroQueue)}
              style={({ pressed }) => [styles.heroPlay, (pressed || !hero) && { opacity: 0.8 }]}
            >
              <Play size={15} color={colors.primaryContrast} fill={colors.primaryContrast} />
              <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
                Écouter le mix
              </T>
            </Pressable>
          </View>
        </View>

        {slides.length > 1 ? (
          <View style={styles.heroControls}>
            <View style={styles.dots}>
              {slides.map((slide, slideIndex) => (
                <Pressable
                  key={slide.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Afficher ${slide.title}`}
                  onPress={() => goTo(slideIndex)}
                  style={styles.dotHit}
                >
                  <View style={[styles.dot, slideIndex === activeIndex && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => goTo(activeIndex - 1)} style={styles.heroButton} accessibilityLabel="Mix précédent">
              <ChevronLeft size={15} color={colors.subtle} />
            </Pressable>
            <Pressable
              onPress={() => setPaused((value) => !value)}
              style={styles.heroButton}
              accessibilityLabel={paused ? 'Reprendre le carrousel' : 'Mettre le carrousel en pause'}
            >
              {paused ? (
                <Play size={14} color={colors.subtle} fill={colors.subtle} />
              ) : (
                <Pause size={14} color={colors.subtle} />
              )}
            </Pressable>
            <Pressable onPress={() => goTo(activeIndex + 1)} style={styles.heroButton} accessibilityLabel="Mix suivant">
              <ChevronRight size={15} color={colors.subtle} />
            </Pressable>
          </View>
        ) : null}
      </LinearGradient>

      {data.shelves.map((shelf) => (
        <ShelfRow key={shelf.id} shelf={shelf} onOpenArtist={(id) => router.push(`/artist/${id}`)} />
      ))}
    </Screen>
  );
}

function Shortcut({ track, onPlay }: { track: Track; onPlay: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lire ${track.title}`}
      onPress={onPlay}
      style={({ pressed }) => [styles.shortcut, pressed && { backgroundColor: 'rgba(255,255,255,0.12)' }]}
    >
      <Cover seed={track.id} title={track.title} size={42} textSize={12} />
      <T weight="semibold" numberOfLines={1} style={styles.shortcutTitle}>
        {track.title}
      </T>
      <View style={styles.shortcutPlay}>
        <Play size={11} color={colors.primaryContrast} fill={colors.primaryContrast} />
      </View>
    </Pressable>
  );
}

function ShelfRow({ shelf, onOpenArtist }: { shelf: Shelf; onOpenArtist: (id: string) => void }) {
  const { playTrack, current, isPlaying, toggle } = usePlayer();
  const tracks = shelf.items.filter(isTrack);
  const context = tracks.length > 0 ? tracks : undefined;

  return (
    <Carousel title={shelf.title} subtitle={shelf.subtitle}>
      {shelf.items.map((item) => {
        if (isTrack(item)) {
          const active = current?.id === item.id;
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.title}
              subtitle={item.artist.name}
              playing={active && isPlaying}
              imageUrl={item.album?.coverUrl ?? item.coverUrl}
              onPlay={() => (active ? toggle() : playTrack(item, context))}
            />
          );
        }
        if (isPlaylist(item)) {
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.title}
              subtitle={item.description ?? `${item.tracks.length} titres`}
              onPlay={() => item.tracks[0] && playTrack(item.tracks[0], item.tracks)}
            />
          );
        }
        if (isArtist(item)) {
          return (
            <MediaCard
              key={item.id}
              seed={item.id}
              title={item.name}
              subtitle={item.genres?.slice(0, 2).join(' · ')}
              shape="circle"
              imageUrl={item.imageUrl}
              verified={item.verified}
              onSelect={() => onOpenArtist(item.id)}
            />
          );
        }
        return null;
      })}
    </Carousel>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 24, letterSpacing: -0.5, marginTop: 10 },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
    marginTop: 14,
  },
  shortcut: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingRight: 8,
    overflow: 'hidden',
  },
  shortcutTitle: { flex: 1, fontSize: 11 },
  shortcutPlay: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    marginTop: 28,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' },
  heroInfo: { flex: 1, minWidth: 160 },
  heroKicker: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 24, letterSpacing: -0.6, marginTop: 6 },
  heroSubtitle: { fontSize: 12, marginTop: 6 },
  heroHint: { fontSize: 10, marginTop: 4 },
  heroPlay: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  heroControls: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  dots: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dotHit: { width: 14, height: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 14, backgroundColor: colors.primary },
  heroButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
