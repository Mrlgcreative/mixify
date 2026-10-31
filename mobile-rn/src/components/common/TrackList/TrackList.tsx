import { BadgeCheck, Heart, Pause, Play, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatTime } from '@/lib/format';
import { useLibraryStore } from '@/store/library';
import { usePlayer } from '@/store/player';
import { colors } from '@/theme/theme';
import type { Track } from '@/types/music';
import { Cover } from '../Cover/Cover';
import { T } from '../T/T';

interface TrackListProps {
  tracks: Track[];
  showAlbum?: boolean;
  /** Met en évidence la ligne du titre en cours. */
  highlightCurrent?: boolean;
  /** Bouton de retrait (playlist). */
  onRemove?: (track: Track) => void;
  /** Actions propres à l'appelant (espace artiste : éditer, supprimer). */
  renderActions?: (track: Track) => ReactNode;
  /** Affiche le rang (classement) à gauche de la pochette. */
  numbered?: boolean;
}

/** Liste de titres réutilisée (accueil, recherche, classement, playlists). */
export function TrackList({
  tracks,
  showAlbum = false,
  highlightCurrent = true,
  onRemove,
  renderActions,
  numbered = false,
}: TrackListProps) {
  const { current, isPlaying, playTrack, toggle, addToQueue } = usePlayer();
  const { favorites, toggleFavorite } = useLibraryStore();

  return (
    <View>
      {tracks.map((track, index) => {
        const isCurrent = highlightCurrent && current?.id === track.id;
        const liked = Boolean(favorites[track.id]);

        return (
          <Pressable
            key={track.id}
            accessibilityRole="button"
            accessibilityLabel={`Lire ${track.title}`}
            onPress={() => (isCurrent ? toggle() : playTrack(track, tracks))}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.elevated }]}
          >
            {numbered ? (
              <T
                weight="semibold"
                color={index < 3 ? colors.primary : colors.muted}
                style={styles.rank}
              >
                {index + 1}
              </T>
            ) : null}

            <View>
              <Cover
                seed={track.id}
                title={track.title}
                imageUrl={track.album?.coverUrl ?? track.coverUrl}
                size={44}
              />
              {isCurrent ? (
                <View style={styles.overlay}>
                  {isPlaying ? (
                    <Pause size={16} color="#fff" fill="#fff" />
                  ) : (
                    <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.info}>
              <T
                weight="medium"
                color={isCurrent ? colors.primary : colors.text}
                numberOfLines={1}
                style={styles.title}
              >
                {track.title}
              </T>
              <View style={styles.subRow}>
                <T color={colors.muted} numberOfLines={1} style={styles.subtitle}>
                  {showAlbum && track.album ? `${track.artist.name} · ${track.album.title}` : track.artist.name}
                </T>
                {track.artist.verified ? (
                  <BadgeCheck size={13} color={colors.primary} style={{ marginLeft: 3 }} />
                ) : null}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={liked ? `Retirer ${track.title} des favoris` : `Ajouter ${track.title} aux favoris`}
                onPress={() => void toggleFavorite(track.id)}
                hitSlop={8}
                style={styles.icon}
              >
                <Heart
                  size={15}
                  color={liked ? colors.primary : colors.muted}
                  fill={liked ? colors.primary : 'none'}
                />
              </Pressable>
              {renderActions ? renderActions(track) : null}
              {onRemove ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${track.title} de la playlist`}
                  onPress={() => onRemove(track)}
                  hitSlop={8}
                  style={styles.icon}
                >
                  <T color={colors.muted} style={{ fontSize: 18, lineHeight: 20 }}>
                    ×
                  </T>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ajouter ${track.title} à la file d’attente`}
                onPress={() => addToQueue(track)}
                hitSlop={8}
                style={styles.icon}
              >
                <Plus size={15} color={colors.muted} />
              </Pressable>
              <T color={colors.muted} style={styles.duration}>
                {formatTime(track.duration)}
              </T>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rank: { width: 20, textAlign: 'right', fontSize: 13 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 10,
  },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 13 },
  subRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  subtitle: { fontSize: 11, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { padding: 2 },
  duration: { fontSize: 11, width: 34, textAlign: 'right' },
});
