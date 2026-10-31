import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { deleteTrack } from '@/api/musicApi';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { confirm, notify } from '@/lib/dialogs';
import { formatDuration } from '@/lib/format';
import { colors, fontScale, radius } from '@/theme/theme';
import type { Track } from '@/types/music';
import { TrackEditModal } from './TrackEditModal';

/** Catalogue personnel : filtre, édition des métadonnées et suppression. */
export function TracksTab({
  tracks,
  onRefresh,
  onPublish,
}: {
  tracks: Track[];
  onRefresh: () => void;
  onPublish: () => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Track | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const filtered = tracks.filter((track) =>
    [track.title, track.album?.title, track.genre]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  const remove = async (track: Track) => {
    const ok = await confirm(
      `Supprimer « ${track.title} » ?`,
      'Le fichier audio sera aussi supprimé du stockage. Les écoutes, favoris et playlists liés à ce morceau seront retirés.',
      'Supprimer',
      true,
    );
    if (!ok) return;
    setRemoving(track.id);
    try {
      await deleteTrack(track.id);
      onRefresh();
      notify(`« ${track.title} » supprimé.`);
    } catch (cause) {
      notify('Suppression impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="extrabold" style={styles.title}>
            Mes morceaux
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            {tracks.length} titre{tracks.length > 1 ? 's' : ''} ·{' '}
            {formatDuration(tracks.reduce((total, track) => total + track.duration * 1000, 0))}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPublish}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.85 }]}
        >
          <Plus size={14} color={colors.primaryContrast} />
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
            Ajouter
          </T>
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Filtrer…"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Filtrer mes morceaux"
        style={styles.search}
      />

      <View style={styles.list}>
        {filtered.length > 0 ? (
          <TrackList
            tracks={filtered}
            showAlbum
            renderActions={(track) => (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Modifier ${track.title}`}
                  onPress={() => setEditing(track)}
                  hitSlop={8}
                  style={styles.action}
                >
                  <Pencil size={14} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer ${track.title}`}
                  disabled={removing === track.id}
                  onPress={() => void remove(track)}
                  hitSlop={8}
                  style={[styles.action, removing === track.id && { opacity: 0.3 }]}
                >
                  {removing === track.id ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                  ) : (
                    <Trash2 size={14} color={colors.muted} />
                  )}
                </Pressable>
              </>
            )}
          />
        ) : (
          <View style={styles.emptyCard}>
            <T color={colors.muted} style={{ fontSize: 13 }}>
              {tracks.length === 0
                ? 'Ton catalogue est vide.'
                : 'Aucun morceau ne correspond au filtre.'}
            </T>
          </View>
        )}
      </View>

      {editing ? (
        <TrackEditModal
          track={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onRefresh();
            notify('Morceau mis à jour.');
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  title: { fontSize: 22, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 2 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  search: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12 * fontScale,
    marginBottom: 12,
  },
  list: { marginTop: 2 },
  action: { padding: 2 },
  emptyCard: { borderRadius: radius.panel, backgroundColor: colors.card, padding: 20 },
});
