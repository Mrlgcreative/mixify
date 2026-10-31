import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Globe, Pencil, Upload } from 'lucide-react-native';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Cover } from '@/components/common/Cover/Cover';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { formatDuration } from '@/lib/format';
import { colors, radius } from '@/theme/theme';
import type { ArtistDashboard, ArtistStats } from '@/types/music';
import { ListeningStats } from './ListeningStats';
import { ReferralCard } from './ReferralCard';

type Tab = 'overview' | 'tracks' | 'publish' | 'profile';

/** Lien cliquable uniquement pour une URL http(s) : évite les schémas dangereux. */
function safeUrl(url?: string): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <T weight="extrabold" style={styles.statValue}>
        {value}
      </T>
      <T color={colors.muted} style={styles.statLabel}>
        {label}
      </T>
    </View>
  );
}

/** Vue d'ensemble : identité publique, chiffres, parrainage et derniers titres. */
export function OverviewTab({
  data,
  stats,
  onTab,
}: {
  data: ArtistDashboard;
  stats: ArtistStats | null;
  onTab: (tab: Tab) => void;
}) {
  const { artist, tracks, totalDurationMs } = data;
  const albums = new Set(tracks.map((track) => track.album?.title).filter(Boolean)).size;
  const website = safeUrl(artist.websiteUrl);

  return (
    <View>
      <LinearGradient
        colors={['rgba(243,194,75,0.24)', colors.elevated, colors.panel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {artist.bannerUrl ? (
          <Image
            source={{ uri: artist.bannerUrl }}
            alt={`Bannière de ${artist.name}`}
            cachePolicy="memory-disk"
            contentFit="cover"
            transition={150}
            style={styles.banner}
          />
        ) : null}

        <View style={styles.heroRow}>
          <Cover
            seed={artist.id}
            title={artist.name}
            imageUrl={artist.imageUrl}
            size={88}
            round={44}
            textSize={24}
          />

          <View style={{ flex: 1, minWidth: 0 }}>
            <T color="rgba(255,255,255,0.6)" weight="semibold" style={styles.kicker}>
              Profil artiste
            </T>
            <View style={styles.nameRow}>
              <T weight="extrabold" numberOfLines={2} style={styles.name}>
                {artist.name}
              </T>
              {artist.verified ? <BadgeCheck size={21} color={colors.primary} /> : null}
            </View>
            <View style={styles.metaRow}>
              {artist.genres && artist.genres.length > 0 ? (
                <T color="rgba(255,255,255,0.7)" style={styles.meta}>
                  {artist.genres.join(' · ')}
                </T>
              ) : null}
              {artist.country ? (
                <T color="rgba(255,255,255,0.7)" style={styles.meta}>
                  {artist.country}
                </T>
              ) : null}
              {website ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void Linking.openURL(website)}
                  style={styles.website}
                >
                  <Globe size={12} color="rgba(255,255,255,0.7)" />
                  <T color="rgba(255,255,255,0.7)" style={styles.meta}>
                    Site
                  </T>
                </Pressable>
              ) : null}
            </View>
            {artist.bio ? (
              <T color="rgba(255,255,255,0.75)" style={styles.bio}>
                {artist.bio}
              </T>
            ) : null}
          </View>
        </View>

        <View style={styles.heroActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onTab('publish')}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Upload size={14} color={colors.primaryContrast} />
            <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
              Publier
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onTab('profile')}
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.8 }]}
          >
            <Pencil size={13} color={colors.text} />
            <T weight="semibold" style={{ fontSize: 13 }}>
              Modifier
            </T>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.stats}>
        <Stat label="Morceaux" value={tracks.length} />
        <Stat label="Durée totale" value={formatDuration(totalDurationMs)} />
        <Stat label="Albums" value={albums} />
        <Stat label="Abonnés" value={artist.followers} />
      </View>

      {data.referral?.code ? (
        <ReferralCard referral={data.referral} verified={artist.verified} />
      ) : null}

      {stats ? <ListeningStats stats={stats} /> : null}

      <View style={styles.latest}>
        <View style={styles.latestHead}>
          <View style={{ flex: 1 }}>
            <T weight="bold" style={styles.sectionTitle}>
              Derniers morceaux
            </T>
            <T color={colors.muted} style={styles.sectionSubtitle}>
              Les plus récents de ton catalogue.
            </T>
          </View>
          {tracks.length > 0 ? (
            <Pressable onPress={() => onTab('tracks')} hitSlop={8}>
              <T weight="semibold" color={colors.primary} style={{ fontSize: 11 }}>
                Tout voir
              </T>
            </Pressable>
          ) : null}
        </View>

        {tracks.length > 0 ? (
          <TrackList tracks={tracks.slice(0, 5)} />
        ) : (
          <View style={styles.emptyCard}>
            <T color={colors.muted} style={{ fontSize: 13 }}>
              Aucun morceau pour l’instant.{' '}
              <T
                weight="semibold"
                color={colors.primary}
                onPress={() => onTab('publish')}
                style={{ fontSize: 13 }}
              >
                Publie ton premier titre
              </T>
              .
            </T>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 16,
    borderRadius: radius.panel,
    padding: 18,
    overflow: 'hidden',
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  banner: { height: 110, marginHorizontal: -18, marginTop: -18, marginBottom: 14, opacity: 0.7 },
  kicker: { fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  name: { fontSize: 26, letterSpacing: -0.6, flexShrink: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, marginTop: 5 },
  meta: { fontSize: 11 },
  website: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bio: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 90,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    padding: 14,
  },
  statValue: { fontSize: 21 },
  statLabel: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 3 },
  latest: { marginTop: 28 },
  latestHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 18 },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  emptyCard: {
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    padding: 20,
  },
});
