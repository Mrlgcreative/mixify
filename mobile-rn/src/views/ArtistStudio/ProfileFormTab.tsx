import { Disc3 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { createArtist, updateArtist } from '@/api/musicApi';
import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { colors, fontScale, radius } from '@/theme/theme';
import type { ArtistInput, ArtistProfile } from '@/types/music';

/** Création / édition du profil public de l'artiste. */
export function ProfileFormTab({
  artist,
  onSaved,
}: {
  artist?: ArtistProfile;
  onSaved: () => void;
}) {
  const [input, setInput] = useState<ArtistInput>({
    name: artist?.name ?? '',
    bio: artist?.bio ?? '',
    imageUrl: artist?.imageUrl ?? '',
    bannerUrl: artist?.bannerUrl ?? '',
    genres: artist?.genres?.join(', ') ?? '',
    country: artist?.country ?? '',
    websiteUrl: artist?.websiteUrl ?? '',
    socialLinks: artist?.socialLinks ?? '',
  });
  const [busy, setBusy] = useState(false);

  const set = (field: keyof ArtistInput) => (value: string) =>
    setInput((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    if (!input.name.trim()) return;
    if (artist) {
      const ok = await confirm(
        'Enregistrer les modifications du profil artiste ?',
        'Ces informations sont publiques et apparaissent dans le catalogue.',
        'Enregistrer',
      );
      if (!ok) return;
    }
    setBusy(true);
    try {
      if (artist) await updateArtist(artist.id, input);
      else await createArtist(input);
      notify(artist ? 'Profil artiste mis à jour.' : 'Profil artiste créé.');
      onSaved();
    } catch (cause) {
      notify('Enregistrement impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <T weight="extrabold" style={styles.title}>
        {artist ? 'Profil artiste' : 'Créer ton profil artiste'}
      </T>
      <T color={colors.muted} style={styles.intro}>
        {artist
          ? 'Ces informations sont publiques : elles apparaissent dans le catalogue et sur tes morceaux.'
          : 'Choisis le nom sous lequel tu publieras. Tu pourras compléter ta bio et tes liens plus tard.'}
      </T>

      <View style={styles.form}>
        <Field label="Nom d'artiste" value={input.name} onChange={set('name')} placeholder="Ton nom de scène" />
        <Field
          label="Bio"
          value={input.bio ?? ''}
          onChange={set('bio')}
          placeholder="Quelques mots sur ton univers musical…"
          multiline
        />
        <Field
          label="Genres (séparés par des virgules)"
          value={input.genres ?? ''}
          onChange={set('genres')}
          placeholder="rap, soul, electro"
        />
        <View style={styles.two}>
          <View style={{ flex: 1 }}>
            <Field label="Pays" value={input.country ?? ''} onChange={set('country')} placeholder="RDC" />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Site web"
              value={input.websiteUrl ?? ''}
              onChange={set('websiteUrl')}
              placeholder="https://…"
            />
          </View>
        </View>

        <Field
          label="Photo de profil (URL)"
          value={input.imageUrl ?? ''}
          onChange={set('imageUrl')}
          placeholder="https://…"
        />
        <Field
          label="Bannière (URL)"
          value={input.bannerUrl ?? ''}
          onChange={set('bannerUrl')}
          placeholder="https://…"
        />
        <Field
          label="Réseaux / liens (un par ligne)"
          value={input.socialLinks ?? ''}
          onChange={set('socialLinks')}
          placeholder={'https://instagram.com/…\nhttps://youtube.com/@…'}
          multiline
        />

        <T color={colors.muted} style={styles.hint}>
          L’envoi d’images depuis le téléphone n’est pas encore disponible : colle une URL
          publique pour le moment.
        </T>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !input.name.trim()}
            onPress={() => void submit()}
            style={[styles.save, (busy || !input.name.trim()) && { opacity: 0.4 }]}
          >
            {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : null}
            <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
              {busy ? 'Enregistrement…' : artist ? 'Enregistrer' : 'Créer mon profil'}
            </T>
          </Pressable>
          {artist ? (
            <View style={styles.followers}>
              <Disc3 size={13} color={colors.muted} />
              <T color={colors.muted} style={{ fontSize: 11 }}>
                {artist.followers} abonné{artist.followers > 1 ? 's' : ''}
              </T>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
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
        multiline={multiline}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  title: { fontSize: 22, letterSpacing: -0.4 },
  intro: { fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 460 },
  form: { gap: 12, marginTop: 16, maxWidth: 560 },
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
  textarea: { minHeight: 86, textAlignVertical: 'top' },
  two: { flexDirection: 'row', gap: 10 },
  hint: { fontSize: 10, lineHeight: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  followers: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
