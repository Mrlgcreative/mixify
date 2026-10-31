import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { updateTrack } from '@/api/musicApi';
import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { colors, fontScale, radius } from '@/theme/theme';
import type { Track } from '@/types/music';

/** Édition des métadonnées d'un morceau (le fichier audio n'est pas remplacé). */
export function TrackEditModal({
  track,
  onClose,
  onSaved,
}: {
  track: Track;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(track.title);
  const [album, setAlbum] = useState(track.album?.title ?? '');
  const [genre, setGenre] = useState(track.genre ?? '');
  const [key, setKey] = useState(track.key ?? '');
  const [bpm, setBpm] = useState(track.bpm?.toString() ?? '');
  const [year, setYear] = useState(track.year?.toString() ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    const ok = await confirm(
      `Enregistrer les modifications de « ${track.title} » ?`,
      'Les informations du morceau seront mises à jour dans le catalogue.',
      'Enregistrer',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await updateTrack(track.id, {
        title: title.trim(),
        album: album.trim() || undefined,
        genre: genre.trim() || undefined,
        key: key.trim() || undefined,
        bpm: bpm ? Number(bpm) : undefined,
        year: year ? Number(year) : undefined,
      });
      onSaved();
    } catch (cause) {
      notify('Enregistrement impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <T weight="bold" style={{ fontSize: 17 }}>
                Modifier le morceau
              </T>
              <T color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
                Les fichiers audio ne sont pas remplacés.
              </T>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={10}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.form}
            contentContainerStyle={{ gap: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Field label="Titre" value={title} onChange={setTitle} />
            <Field label="Album" value={album} onChange={setAlbum} />
            <View style={styles.two}>
              <View style={{ flex: 1 }}>
                <Field label="Genre" value={genre} onChange={setGenre} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Tonalité" value={key} onChange={setKey} placeholder="Am" />
              </View>
            </View>
            <View style={styles.two}>
              <View style={{ flex: 1 }}>
                <Field label="BPM" value={bpm} onChange={setBpm} keyboardType="numeric" placeholder="120" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Année" value={year} onChange={setYear} keyboardType="numeric" placeholder="2026" />
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.cancel}>
              <T color={colors.subtle} weight="semibold" style={{ fontSize: 13 }}>
                Annuler
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !title.trim()}
              onPress={() => void submit()}
              style={[styles.save, (busy || !title.trim()) && { opacity: 0.4 }]}
            >
              {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : null}
              <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </T>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric';
}) {
  return (
    <View style={{ gap: 5 }}>
      <T color={colors.muted} weight="semibold" style={styles.label}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: radius.panel,
    backgroundColor: colors.panel,
    padding: 18,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  form: { marginTop: 16 },
  two: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 9, letterSpacing: 0.7, textTransform: 'uppercase' },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 13 * fontScale,
  },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 16, marginTop: 18 },
  cancel: { paddingVertical: 8 },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
});
