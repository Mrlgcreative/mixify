import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clearHistory } from '@/api/musicApi';
import { Cover } from '@/components/common/Cover/Cover';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { formatDate } from '@/lib/format';
import type { AsyncState } from '@/lib/useAsync';
import { usePlayer } from '@/store/player';
import { colors } from '@/theme/theme';
import type { HistoryEntry } from '@/types/music';

/** Onglet Historique : 200 dernières écoutes du compte. */
export function HistoryTab({
  history,
  onCleared,
}: {
  history: AsyncState<HistoryEntry[]>;
  onCleared: () => void;
}) {
  const { playTrack } = usePlayer();
  const [clearing, setClearing] = useState(false);

  const clear = async () => {
    const ok = await confirm(
      'Effacer tout votre historique d’écoute ?',
      'Cette action est définitive et supprime aussi tes statistiques d’écoute.',
      'Effacer',
      true,
    );
    if (!ok) return;
    setClearing(true);
    try {
      await clearHistory();
      onCleared();
      notify('Historique effacé.');
    } catch (cause) {
      notify('Suppression impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setClearing(false);
    }
  };

  const entries = history.data ?? [];

  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={styles.title}>
            Historique
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            {entries.length} écoute(s) récente(s)
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={clearing || entries.length === 0}
          onPress={() => void clear()}
          style={[styles.clear, (clearing || entries.length === 0) && { opacity: 0.4 }]}
        >
          <Trash2 size={14} color={colors.muted} />
          <T color={colors.muted} weight="semibold" style={{ fontSize: 11 }}>
            {clearing ? 'Suppression…' : 'Tout effacer'}
          </T>
        </Pressable>
      </View>

      {history.loading && !history.data ? (
        <Loading label="Chargement de l’historique…" />
      ) : entries.length === 0 ? (
        <T color={colors.muted} style={styles.empty}>
          Votre historique est vide : lancez un morceau pour le remplir.
        </T>
      ) : (
        <View>
          {entries.map((entry) => (
            <Pressable
              key={entry.id}
              disabled={!entry.track}
              onPress={() => entry.track && playTrack(entry.track)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.elevated }]}
            >
              <Cover
                seed={entry.track?.id ?? entry.id}
                title={entry.title}
                imageUrl={entry.coverUrl}
                size={42}
                textSize={11}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" numberOfLines={1} style={{ fontSize: 12 }}>
                  {entry.title}
                </T>
                <T color={colors.muted} numberOfLines={1} style={{ fontSize: 10 }}>
                  {entry.artist}
                </T>
              </View>
              <T color={colors.muted} style={{ fontSize: 10 }}>
                {formatDate(entry.playedAt)}
              </T>
            </Pressable>
          ))}
        </View>
      )}

      {history.error ? (
        <ErrorState
          title="Historique indisponible"
          error={history.error}
          onRetry={history.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 12 },
  title: { fontSize: 19 },
  subtitle: { fontSize: 12, marginTop: 2 },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  empty: { fontSize: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
});
