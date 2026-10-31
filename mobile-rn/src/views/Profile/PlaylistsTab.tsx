import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { MediaCard } from '@/components/common/MediaCard/MediaCard';
import { T } from '@/components/common/T/T';
import { colors } from '@/theme/theme';
import type { AsyncState } from '@/lib/useAsync';
import type { Library } from '@/types/music';

/** Onglet Playlists du profil. */
export function PlaylistsTab({
  library,
  onManage,
}: {
  library: AsyncState<Library>;
  onManage: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();

  if (library.loading && !library.data) return <Loading label="Chargement des playlists…" />;
  if (library.error) {
    return (
      <ErrorState title="Playlists indisponibles" error={library.error} onRetry={library.retry} />
    );
  }

  const playlists = library.data?.playlists ?? [];
  const cardWidth = (width - 32 - 12) / 2;

  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={styles.title}>
            Vos playlists
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            {playlists.length} playlist(s)
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onManage}
          style={({ pressed }) => [styles.manage, pressed && { opacity: 0.8 }]}
        >
          <T weight="semibold" style={{ fontSize: 11 }}>
            Gérer dans la bibliothèque
          </T>
        </Pressable>
      </View>

      {playlists.length === 0 ? (
        <T color={colors.muted} style={styles.empty}>
          Aucune playlist pour l’instant. Créez-en une depuis la bibliothèque.
        </T>
      ) : (
        <View style={styles.grid}>
          {playlists.map((playlist) => (
            <MediaCard
              key={playlist.id}
              seed={playlist.id}
              title={playlist.title}
              subtitle={playlist.description}
              width={cardWidth}
              onSelect={() => router.push(`/playlist/${playlist.id}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { fontSize: 19 },
  subtitle: { fontSize: 12, marginTop: 2 },
  manage: {
    backgroundColor: colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  empty: { fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
