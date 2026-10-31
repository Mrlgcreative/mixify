import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import type { AsyncState } from '@/lib/useAsync';
import { colors } from '@/theme/theme';
import type { Library } from '@/types/music';

/** Onglet Favoris du profil. */
export function FavoritesTab({ library }: { library: AsyncState<Library> }) {
  if (library.loading && !library.data) return <Loading label="Chargement des favoris…" />;
  if (library.error) {
    return <ErrorState title="Favoris indisponibles" error={library.error} onRetry={library.retry} />;
  }

  const liked = library.data?.liked ?? [];
  return (
    <View>
      <T weight="bold" style={styles.title}>
        Titres likés
      </T>
      <T color={colors.muted} style={styles.subtitle}>
        {liked.length} titre(s)
      </T>
      {liked.length === 0 ? (
        <T color={colors.muted} style={styles.empty}>
          Aucun favori pour l’instant : cliquez sur le cœur d’un morceau.
        </T>
      ) : (
        <TrackList tracks={liked} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19 },
  subtitle: { fontSize: 12, marginTop: 2, marginBottom: 12 },
  empty: { fontSize: 12 },
});
