import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Disc, Music, Search as SearchIcon, User } from 'lucide-react-native';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { search } from '@/api/musicApi';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { MediaCard } from '@/components/common/MediaCard/MediaCard';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { FollowButton } from '@/components/Follow/FollowButton';
import { useAsync } from '@/lib/useAsync';
import { useSearchQuery } from '@/store/search';
import { colors } from '@/theme/theme';

const GENRES = [
  { title: 'Rumba', colors: ['rgba(251,191,36,0.30)', 'rgba(154,52,18,0.22)'] },
  { title: 'Ndombolo', colors: ['rgba(251,113,133,0.28)', 'rgba(153,27,27,0.22)'] },
  { title: 'Gospel', colors: ['rgba(52,211,153,0.26)', 'rgba(15,118,110,0.22)'] },
  { title: 'Amapiano', colors: ['rgba(56,189,248,0.26)', 'rgba(29,78,216,0.22)'] },
  { title: 'Rap', colors: ['rgba(167,139,250,0.26)', 'rgba(162,28,175,0.22)'] },
  { title: 'Kolwezi', colors: ['rgba(253,224,71,0.28)', 'rgba(180,83,9,0.22)'] },
] as const;

/** Recherche : genres d'ici puis résultats, comme la vue web. */
export function Search() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { query, setQuery } = useSearchQuery();
  const { data, loading, error, retry } = useAsync(
    'search',
    () => (query.trim() ? search(query) : Promise.resolve(null)),
    [query],
  );
  const cardWidth = (width - 32 - 12) / 2;

  if (!query.trim()) {
    return (
      <Screen>
        <View style={styles.head}>
          <T weight="bold" style={styles.title}>
            Rechercher
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            Découvre de nouveaux artistes, albums et titres
          </T>
        </View>

        <T weight="semibold" style={styles.sectionTitle}>
          Genres d’ici
        </T>
        <View style={styles.genreGrid}>
          {GENRES.map((genre) => (
            <Pressable
              key={genre.title}
              accessibilityRole="button"
              accessibilityLabel={`Rechercher ${genre.title}`}
              onPress={() => setQuery(genre.title)}
              style={{ width: cardWidth, height: 96, borderRadius: 10, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[...genre.colors]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.genreTile}
              >
                <Music size={20} color="rgba(255,255,255,0.55)" style={styles.genreIcon} />
                <T weight="bold" style={styles.genreLabel}>
                  {genre.title}
                </T>
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <Loading label={`Recherche de « ${query} »…`} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Recherche indisponible" error={error} onRetry={retry} />
      </Screen>
    );
  }

  const tracks = data?.tracks ?? [];
  const artists = data?.artists ?? [];
  const albums = data?.albums ?? [];
  const playlists = data?.playlists ?? [];
  const total = tracks.length + artists.length + albums.length + playlists.length;

  return (
    <Screen>
      <View style={styles.head}>
        <T weight="bold" style={styles.title}>
          Résultats pour « <T color={colors.primary} weight="bold" style={styles.title}>{query}</T> »
        </T>
        <T color={colors.muted} style={styles.subtitle}>
          {total} résultat{total > 1 ? 's' : ''}
        </T>
      </View>

      {tracks.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle icon={<Music size={17} color={colors.primary} />} label="Titres" />
          <View style={styles.card}>
            <TrackList tracks={tracks} />
          </View>
        </View>
      ) : null}

      {artists.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle icon={<User size={17} color={colors.primary} />} label="Artistes" />
          <View style={styles.grid}>
            {artists.map((artist) => (
              <View key={artist.id} style={[styles.artistCell, { width: cardWidth }]}>
                <MediaCard
                  seed={artist.id}
                  title={artist.name}
                  subtitle={artist.genres?.slice(0, 2).join(' · ')}
                  shape="circle"
                  imageUrl={artist.imageUrl}
                  verified={artist.verified}
                  width={Math.min(cardWidth, 150)}
                  onSelect={() => router.push(`/artist/${artist.id}`)}
                />
                <FollowButton artist={artist} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {albums.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle icon={<Disc size={17} color={colors.primary} />} label="Albums" />
          <View style={styles.grid}>
            {albums.map((album) => (
              <MediaCard
                key={album.id}
                seed={album.id}
                title={album.title}
                subtitle={album.artist?.name}
                imageUrl={album.coverUrl}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      ) : null}

      {playlists.length > 0 ? (
        <View style={styles.section}>
          <SectionTitle icon={<SearchIcon size={17} color={colors.primary} />} label="Playlists" />
          <View style={styles.grid}>
            {playlists.map((playlist) => (
              <MediaCard
                key={playlist.id}
                seed={playlist.id}
                title={playlist.title}
                subtitle={playlist.description}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      ) : null}

      {total === 0 ? (
        <View style={styles.empty}>
          <SearchIcon size={44} color="rgba(142,142,147,0.5)" />
          <T weight="semibold" style={{ fontSize: 16 }}>
            Aucun résultat
          </T>
          <T color={colors.muted} style={styles.emptyText}>
            Aucun résultat pour « {query} ». Essaie un autre mot-clé.
          </T>
        </View>
      ) : null}
    </Screen>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <T weight="semibold" style={{ fontSize: 16 }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 12, marginBottom: 20 },
  title: { fontSize: 20, lineHeight: 28 },
  subtitle: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  genreTile: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  genreIcon: { position: 'absolute', top: 10, right: 10 },
  genreLabel: { fontSize: 16 },
  section: { marginBottom: 28 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  card: { backgroundColor: colors.card, borderRadius: 10, padding: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  artistCell: { alignItems: 'center', gap: 6 },
  empty: { alignItems: 'center', paddingVertical: 56, gap: 8 },
  emptyText: { fontSize: 12, textAlign: 'center' },
});
