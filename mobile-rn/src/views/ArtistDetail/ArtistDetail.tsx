import { BadgeCheck, Play } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { getTracks } from '@/api/musicApi';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { TopBar } from '@/components/common/TopBar/TopBar';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { useAsync } from '@/lib/useAsync';
import { usePlayer } from '@/store/player';
import { colors } from '@/theme/theme';

/** Fiche artiste, dérivée du catalogue comme sur le web. */
export function ArtistDetail({ artistId }: { artistId: string }) {
  const { data: allTracks, loading, error, retry } = useAsync('tracks', () => getTracks());
  const { playTrack } = usePlayer();

  const tracks = (allTracks ?? []).filter((track) => track.artist?.id === artistId);
  const artist = tracks[0]?.artist;

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Artiste" />
      <Screen bottomSpace={180}>
        {loading && !allTracks ? (
          <Loading label="Chargement de l’artiste…" />
        ) : error || !allTracks ? (
          <ErrorState title="Artiste indisponible" error={error} onRetry={retry} />
        ) : !artist || tracks.length === 0 ? (
          <ErrorState title="Artiste indisponible" notFound />
        ) : (
          <>
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <T weight="bold" color="rgba(255,255,255,0.6)" style={styles.initials}>
                  {artist.name.slice(0, 2).toUpperCase()}
                </T>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T color={colors.muted} weight="semibold" style={styles.kicker}>
                  Artiste
                </T>
                <View style={styles.nameRow}>
                  <T weight="extrabold" style={styles.name} numberOfLines={2}>
                    {artist.name}
                  </T>
                  {artist.verified ? <BadgeCheck size={24} color={colors.primary} /> : null}
                </View>
                <T color={colors.muted} style={styles.count}>
                  {tracks.length} titre{tracks.length > 1 ? 's' : ''}
                </T>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => playTrack(tracks[0], tracks)}
                  style={({ pressed }) => [styles.playAll, pressed && { opacity: 0.85 }]}
                >
                  <Play size={15} color={colors.primaryContrast} fill={colors.primaryContrast} />
                  <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
                    Lire tout
                  </T>
                </Pressable>
              </View>
            </View>

            <T weight="bold" style={styles.sectionTitle}>
              Titres populaires
            </T>
            <TrackList tracks={tracks} />
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginTop: 12 },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 30 },
  kicker: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  name: { fontSize: 26, letterSpacing: -0.6, flexShrink: 1 },
  count: { fontSize: 12, marginTop: 4 },
  playAll: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  sectionTitle: { fontSize: 18, marginTop: 28, marginBottom: 10 },
});
