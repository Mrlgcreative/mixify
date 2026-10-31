import {
  addTrackToPlaylist,
  deletePlaylist,
  getPlaylist,
  getTracks,
  removeTrackFromPlaylist,
  renamePlaylist,
} from '@/api/musicApi';
import { useRouter } from 'expo-router';
import { ChevronDown, Pencil, Play, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Loading } from '@/components/common/Loading/Loading';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { TopBar } from '@/components/common/TopBar/TopBar';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { confirm, notify } from '@/lib/dialogs';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors, fontScale, radius } from '@/theme/theme';

/** Détail d'une playlist : lecture, renommage, suppression, ajout de titres. */
export function PlaylistDetail({ id }: { id: string }) {
  const router = useRouter();
  // Playlist ouverte par lien profond : aucun écran derrière, retour à l'accueil.
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const { playlistsChanged } = useLibraryStore();
  const { data: playlist, loading, error, retry } = useAsync('playlist', () => getPlaylist(id), [id]);
  const { data: catalog } = useAsync('tracks', () => getTracks());
  const { playTrack } = usePlayer();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const run = async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      playlistsChanged();
      return true;
    } catch (cause) {
      notify(fallback, cause instanceof Error ? cause.message : undefined);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removePlaylist = async () => {
    const ok = await confirm(
      `Supprimer « ${playlist?.title ?? 'cette playlist'} » ?`,
      'La playlist sera définitivement supprimée. Les morceaux restent dans le catalogue.',
      'Supprimer',
      true,
    );
    if (!ok) return;
    if (await run(() => deletePlaylist(id), 'Suppression impossible')) {
      playlistsChanged();
      close();
    }
  };

  const available = (catalog ?? []).filter(
    (track) => !(playlist?.tracks ?? []).some((owned) => owned.id === track.id),
  );

  return (
    <View style={{ flex: 1 }}>
      <TopBar title="Playlist" />
      <Screen bottomSpace={180}>
        {loading && !playlist ? <Loading label="Chargement de la playlist…" /> : null}

        {!loading && (error || !playlist) ? (
          <View style={styles.errorCard}>
            <T weight="bold" style={{ fontSize: 16 }}>
              Playlist indisponible
            </T>
            <T color={colors.muted} style={{ fontSize: 12, marginTop: 6 }}>
              {error ?? 'Cette playlist n’existe plus.'}
            </T>
            <View style={styles.errorActions}>
              <Pressable onPress={retry} style={styles.primaryButton}>
                <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 12 }}>
                  Réessayer
                </T>
              </Pressable>
              <Pressable onPress={close}>
                <T color={colors.muted} style={{ fontSize: 12 }}>
                  Retour
                </T>
              </Pressable>
            </View>
          </View>
        ) : null}

        {playlist ? (
          <>
            <View style={styles.head}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {renaming ? (
                  <View style={styles.renameRow}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      autoFocus
                      style={styles.renameInput}
                      placeholderTextColor={colors.muted}
                    />
                    <Pressable
                      disabled={busy || !name.trim()}
                      onPress={() =>
                        void (async () => {
                          if (await run(() => renamePlaylist(id, name.trim()), 'Renommage impossible')) {
                            setRenaming(false);
                          }
                        })()
                      }
                      style={styles.primaryButton}
                    >
                      <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 11 }}>
                        Enregistrer
                      </T>
                    </Pressable>
                    <Pressable onPress={() => setRenaming(false)}>
                      <T color={colors.muted} style={{ fontSize: 11 }}>
                        Annuler
                      </T>
                    </Pressable>
                  </View>
                ) : (
                  <T weight="extrabold" numberOfLines={2} style={styles.title}>
                    {playlist.title}
                  </T>
                )}
                <T color={colors.muted} style={{ fontSize: 12, marginTop: 3 }}>
                  {playlist.tracks.length} titres
                </T>
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={playlist.tracks.length === 0}
                onPress={() => playTrack(playlist.tracks[0], playlist.tracks)}
                style={({ pressed }) => [
                  styles.playButton,
                  (pressed || playlist.tracks.length === 0) && { opacity: 0.55 },
                ]}
              >
                <Play size={15} color={colors.primaryContrast} fill={colors.primaryContrast} />
                <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 12 }}>
                  Écouter
                </T>
              </Pressable>
              <Pressable
                accessibilityLabel="Renommer la playlist"
                onPress={() => {
                  setName(playlist.title);
                  setRenaming(true);
                }}
                style={styles.iconButton}
              >
                <Pencil size={15} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityLabel="Supprimer la playlist"
                disabled={busy}
                onPress={() => void removePlaylist()}
                style={styles.iconButton}
              >
                <Trash2 size={15} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.tracks}>
              {playlist.tracks.length > 0 ? (
                <TrackList
                  tracks={playlist.tracks}
                  showAlbum
                  onRemove={(track) => {
                    if (!track.playlistEntryId) return;
                    void (async () => {
                      const ok = await confirm(
                        `Retirer « ${track.title} » ?`,
                        'Le morceau quitte cette playlist mais reste dans le catalogue.',
                        'Retirer',
                        true,
                      );
                      if (!ok) return;
                      await run(
                        () => removeTrackFromPlaylist(track.playlistEntryId as string),
                        'Retrait impossible',
                      );
                    })();
                  }}
                />
              ) : (
                <T color={colors.muted} style={{ fontSize: 12 }}>
                  Playlist vide : ajoute des titres ci-dessous.
                </T>
              )}
            </View>

            <Pressable style={styles.addHead} onPress={() => setAdding((value) => !value)}>
              <T weight="semibold" style={{ fontSize: 13, flex: 1 }}>
                Ajouter des titres ({available.length})
              </T>
              <ChevronDown
                size={17}
                color={colors.muted}
                style={{ transform: [{ rotate: adding ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            {adding ? (
              available.length === 0 ? (
                <T color={colors.muted} style={{ fontSize: 12, marginTop: 8 }}>
                  Tout le catalogue est déjà dans cette playlist.
                </T>
              ) : (
                <View style={styles.catalog}>
                  {available.map((track) => (
                    <View key={track.id} style={styles.catalogRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T numberOfLines={1} style={{ fontSize: 12 }}>
                          {track.title}
                        </T>
                        <T color={colors.muted} numberOfLines={1} style={{ fontSize: 10 }}>
                          {track.artist.name}
                        </T>
                      </View>
                      <Pressable
                        accessibilityLabel={`Ajouter ${track.title} à la playlist`}
                        disabled={busy}
                        onPress={() =>
                          void run(
                            () => addTrackToPlaylist(id, track.id),
                            'Ajout impossible',
                          )
                        }
                        style={styles.addIcon}
                      >
                        <Plus size={16} color={colors.muted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )
            ) : null}
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: 8 },
  title: { fontSize: 26, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  renameInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12 * fontScale,
    minWidth: 160,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tracks: { marginTop: 18 },
  addHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.panel,
  },
  catalog: { marginTop: 8, padding: 6, backgroundColor: colors.card, borderRadius: radius.panel },
  catalogRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 6 },
  addIcon: { padding: 4 },
  errorCard: {
    marginTop: 24,
    padding: 20,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  errorActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
});
