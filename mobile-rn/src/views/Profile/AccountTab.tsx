import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar } from '@/components/common/Avatar/Avatar';
import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { useAuth } from '@/store/auth';
import { colors, fontScale, radius } from '@/theme/theme';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from './roleLabels';

/** Onglet Compte : nom, bio, avatar et informations du compte. */
export function AccountTab() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const dirty =
    name.trim() !== (user.name ?? '') ||
    bio.trim() !== (user.bio ?? '') ||
    avatarUrl.trim() !== (user.avatar_url ?? '');

  const submit = async () => {
    if (!name.trim()) {
      notify('Nom requis', 'Le nom affiché ne peut pas être vide.');
      return;
    }
    const ok = await confirm(
      'Enregistrer les modifications du profil ?',
      'Ton nom, ta bio et ta photo seront visibles par les autres utilisateurs.',
      'Enregistrer',
    );
    if (!ok) return;
    setBusy(true);
    try {
      await updateUser({
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      notify('Profil mis à jour.');
    } catch (cause) {
      notify('Mise à jour impossible', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.form}>
        <Field label="Nom affiché" value={name} onChange={setName} maxLength={80} />
        <Field
          label="Bio"
          value={bio}
          onChange={setBio}
          maxLength={500}
          multiline
          placeholder="Quelques mots sur votre univers musical…"
          counter={`${bio.length}/500`}
        />
        <Field label="Avatar (URL)" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://…" />

        <Pressable
          accessibilityRole="button"
          disabled={busy || !dirty || !name.trim()}
          onPress={() => void submit()}
          style={[styles.save, (busy || !dirty || !name.trim()) && { opacity: 0.4 }]}
        >
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </T>
        </Pressable>
      </View>

      <View style={styles.aside}>
        <View style={styles.asideHead}>
          <Avatar user={user} size={52} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight="semibold" numberOfLines={1} style={{ fontSize: 13 }}>
              {user.name || 'Auditeur'}
            </T>
            <T color={colors.muted} style={{ fontSize: 11 }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </T>
          </View>
        </View>

        <Info label="Adresse e-mail" value={user.email} />
        <Info label="Membre depuis" value={formatDate(user.created_at)} />
        {user.birth_date ? <Info label="Date de naissance" value={formatDate(user.birth_date)} /> : null}
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
  maxLength,
  counter,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  counter?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <T weight="semibold" style={styles.label}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        maxLength={maxLength}
        style={[styles.input, multiline && styles.textarea]}
      />
      {counter ? (
        <T color={colors.muted} style={styles.counter}>
          {counter}
        </T>
      ) : null}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <T color={colors.muted} style={styles.infoLabel}>
        {label}
      </T>
      <T numberOfLines={1} style={{ fontSize: 13, marginTop: 2 }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  form: { gap: 14 },
  label: { fontSize: 11 },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 13 * fontScale,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  counter: { fontSize: 10, textAlign: 'right' },
  save: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  aside: {
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 16,
  },
  asideHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 10 },
});
