import { createAudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Music4, Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  uploadTrack,
  type AudioFileInput,
  type PublishStage,
} from '@/api/musicApi';
import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { colors, fontScale, radius } from '@/theme/theme';

const MAX_AUDIO_BYTES = 200 * 1024 * 1024;
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'];

interface PickedFile extends AudioFileInput {
  durationMs?: number;
}

/** Durée locale lue avant l'envoi ; 0 si le format ne se charge pas. */
async function readDurationMs(uri: string): Promise<number | undefined> {
  const player = createAudioPlayer(uri);
  try {
    for (let attempt = 0; attempt < 40 && !player.isLoaded; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return player.isLoaded && player.duration > 0
      ? Math.round(player.duration * 1000)
      : undefined;
  } finally {
    player.remove();
  }
}

/** Publication d'un morceau : envoi vers R2 puis ajout au catalogue. */
export function PublishTab({ onPublished }: { onPublished: () => void }) {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [cover, setCover] = useState('');
  const [bpm, setBpm] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<PublishStage | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setTitle('');
    setAlbum('');
    setGenre('');
    setCover('');
    setBpm('');
    setYear('');
  };

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
    if (!asset.mimeType?.startsWith('audio/') && !AUDIO_EXTENSIONS.includes(extension)) {
      notify('Fichier refusé', 'Choisis un fichier audio (mp3, wav, m4a, ogg, flac, aac).');
      return;
    }

    const size = asset.size ?? new File(asset.uri).info().size ?? 0;
    if (size > MAX_AUDIO_BYTES) {
      notify('Fichier trop lourd', 'La limite est de 200 Mo par morceau.');
      return;
    }
    if (size <= 0) {
      notify('Fichier illisible', 'Le fichier choisi est vide ou inaccessible.');
      return;
    }

    setFile({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType || 'audio/mpeg',
      size,
    });
    setTitle(asset.name.replace(/\.[^.]+$/, ''));

    // La durée arrive après la sélection : l'utilisateur peut déjà remplir le formulaire.
    void readDurationMs(asset.uri).then((durationMs) => {
      setFile((current) => (current?.uri === asset.uri ? { ...current, durationMs } : current));
    });
  };

  const submit = async () => {
    if (!file || !title.trim()) return;
    const ok = await confirm(
      `Publier « ${title.trim() || file.name} » ?`,
      cover
        ? 'Le morceau et sa pochette seront ajoutés au catalogue public.'
        : 'Le morceau sera ajouté au catalogue public, sans pochette.',
      'Publier',
    );
    if (!ok) return;

    setBusy(true);
    setStage(null);
    setProgress(0);
    try {
      const track = await uploadTrack(
        file,
        {
          title: title.trim(),
          album: album.trim() || undefined,
          genre: genre.trim() || undefined,
          bpm: bpm ? Number(bpm) : undefined,
          year: year ? Number(year) : undefined,
          durationMs: file.durationMs,
          coverUrl: cover.trim() || undefined,
        },
        setStage,
        setProgress,
      );
      reset();
      notify(`« ${track.title} » est publié.`);
      onPublished();
    } catch (cause) {
      notify('Publication impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
      setStage(null);
      setProgress(0);
    }
  };

  const percent = stage === 'check' ? 100 : progress;

  return (
    <View style={{ marginTop: 18 }}>
      <T weight="extrabold" style={styles.title}>
        Publier un morceau
      </T>
      <T color={colors.muted} style={styles.intro}>
        Le fichier est téléversé, contrôlé côté serveur (format et taille), puis rattaché à ton
        profil artiste.
      </T>

      <View style={styles.form}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choisir un fichier audio"
          onPress={() => void pick()}
          style={({ pressed }) => [styles.picker, pressed && { borderColor: colors.primary }]}
        >
          <Upload size={20} color={colors.primary} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="medium" numberOfLines={1} style={{ fontSize: 13 }}>
              {file ? file.name : 'Choisir un fichier audio'}
            </T>
            <T color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
              mp3, wav, m4a, ogg, flac, aac — 200 Mo max
            </T>
          </View>
          {file ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer le fichier"
              onPress={() => setFile(null)}
              hitSlop={10}
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          ) : null}
        </Pressable>

        {file?.durationMs ? (
          <View style={styles.preview}>
            <Music4 size={14} color={colors.muted} />
            <T color={colors.muted} style={{ fontSize: 11 }}>
              Durée détectée : {Math.floor(file.durationMs / 60000)} min{' '}
              {Math.round((file.durationMs % 60000) / 1000)} s
            </T>
          </View>
        ) : null}

        <Field label="Titre" value={title} onChange={setTitle} placeholder="Titre du morceau" />
        <View style={styles.two}>
          <View style={{ flex: 1 }}>
            <Field
              label="Album (facultatif)"
              value={album}
              onChange={setAlbum}
              placeholder="Album"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Genre (facultatif)"
              value={genre}
              onChange={setGenre}
              placeholder="Rap, Gospel…"
            />
          </View>
        </View>
        <View style={styles.two}>
          <View style={{ flex: 1 }}>
            <Field
              label="BPM (facultatif)"
              value={bpm}
              onChange={setBpm}
              placeholder="120"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Année (facultatif)"
              value={year}
              onChange={setYear}
              placeholder="2026"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Field
          label="Pochette (URL, facultatif)"
          value={cover}
          onChange={setCover}
          placeholder="https://…"
        />

        <Pressable
          accessibilityRole="button"
          disabled={busy || !file || !title.trim()}
          onPress={() => void submit()}
          style={[
            styles.submit,
            (busy || !file || !title.trim()) && { opacity: 0.4 },
          ]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : null}
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
            {busy
              ? stage === 'check'
                ? 'Contrôle et publication…'
                : `Téléversement… ${progress} %`
              : 'Publier'}
          </T>
        </Pressable>

        {busy ? (
          <View style={styles.progressRow}>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Progression de la publication"
              accessibilityValue={{ min: 0, max: 100, now: percent }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <T color={colors.muted} style={styles.progressText}>
              {percent} %
            </T>
          </View>
        ) : null}
      </View>
    </View>
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
  title: { fontSize: 22, letterSpacing: -0.4 },
  intro: { fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 460 },
  form: { gap: 12, marginTop: 16, maxWidth: 560 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 320 },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  progressText: { fontSize: 11, width: 40, textAlign: 'right' },
});
