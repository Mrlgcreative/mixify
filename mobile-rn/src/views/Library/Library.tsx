import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Heart, Play, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { createPlaylist, getLibrary } from '@/api/musicApi';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { MediaCard } from '@/components/common/MediaCard/MediaCard';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { TrackList } from '@/components/common/TrackList/TrackList';
import { notify } from '@/lib/dialogs';
import { useAsync } from '@/lib/useAsync';
import { useLibraryStore } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors, fontScale, radius } from '@/theme/theme';

/** Bibliothèque : titres likés + playlists, comme la vue web. */
export function Library() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { playlistsChanged } = useLibraryStore();
  const { data, loading, error, retry } = useAsync('library', () => getLibrary());
  const { playTrack } = usePlayer();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const cardWidth = (width - 32 - 12) / 2;

  const submit = async () => {
    const nom = name.trim();
    if (!nom) return;
    setBusy(true);
    try {
      await createPlaylist(nom);
      playlistsChanged();
      setName('');
      setCreating(false);
    } catch (cause) {
      notify('Création impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <Screen>
        <Loading label="Chargement de la bibliothèque…" />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen>
        <ErrorState title="Bibliothèque indisponible" error={error} onRetry={retry} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.likedHead}>
        <View style={{ flex: 1 }}>
          <T weight="extrabold" style={styles.title}>
            Titres likés
          </T>
          <T color={colors.muted} style={styles.subtitle}>
            {data.liked.length} titres
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={data.liked.length === 0}
          onPress={() => playTrack(data.liked[0], data.liked)}
          style={({ pressed }) => [styles.playButton, (pressed || data.liked.length === 0) && { opacity: 0.55 }]}
        >
          <Play size={15} color={colors.primaryContrast} fill={colors.primaryContrast} />
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
            Écouter
          </T>
        </Pressable>
      </View>

      <LinearGradient
        colors={['rgba(243,194,75,0.30)', colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.likedCard}
      >
        <Heart size={48} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
      </LinearGradient>

      <View style={styles.likedList}>
        {data.liked.length > 0 ? (
          <TrackList tracks={data.liked} />
        ) : (
          <T color={colors.muted} style={styles.emptyText}>
            Aucun titre liké pour l’instant : clique sur le cœur d’un morceau.
          </T>
        )}
      </View>

      <View style={styles.playlistsHead}>
        <T weight="bold" style={styles.sectionTitle}>
          Vos playlists
        </T>
        <Pressable
          accessibilityRole="button"
          onPress={() => setCreating((value) => !value)}
          style={({ pressed }) => [styles.newButton, pressed && { opacity: 0.8 }]}
        >
          <Plus size={15} color={colors.text} />
          <T weight="semibold" style={{ fontSize: 12 }}>
            Nouvelle playlist
          </T>
        </Pressable>
      </View>

      {creating ? (
        <View style={styles.createRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nom de la playlist"
            placeholderTextColor={colors.muted}
            style={styles.input}
            autoFocus
          />
          <Pressable
            disabled={busy || !name.trim()}
            onPress={() => void submit()}
            style={[styles.createButton, (busy || !name.trim()) && { opacity: 0.5 }]}
          >
            <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 12 }}>
              {busy ? 'Création…' : 'Créer'}
            </T>
          </Pressable>
          <Pressable onPress={() => setCreating(false)}>
            <T color={colors.muted} style={{ fontSize: 12 }}>
              Annuler
            </T>
          </Pressable>
        </View>
      ) : null}

      {data.playlists.length === 0 ? (
        <T color={colors.muted} style={styles.emptyText}>
          Aucune playlist. Crée-en une pour regrouper tes morceaux.
        </T>
      ) : (
        <View style={styles.grid}>
          {data.playlists.map((playlist) => (
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  likedHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 14 },
  title: { fontSize: 28, letterSpacing: -0.6 },
  subtitle: { fontSize: 12, marginTop: 3 },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  likedCard: {
    height: 140,
    marginTop: 18,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  likedList: { marginTop: 10 },
  emptyText: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  playlistsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18 },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 12 * fontScale,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
