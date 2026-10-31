import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fontScale, radius } from '@/theme/theme';
import { T } from '../common/T/T';

/** Champ de formulaire commun aux écrans d'authentification. */
export function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: 'email-address';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <T color={colors.muted} weight="semibold" style={styles.label}>
        {label}
      </T>
      <View>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secure ? !visible : undefined}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            secure && styles.inputSecure,
          ]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onPress={() => setVisible((current) => !current)}
            hitSlop={8}
            style={styles.eye}
          >
            {visible ? (
              <EyeOff size={18} color={colors.muted} />
            ) : (
              <Eye size={18} color={colors.muted} />
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <T color={colors.danger} style={styles.error}>
      {message}
    </T>
  );
}

export function SubmitButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.submit, (pressed || busy) && { opacity: 0.75 }]}
    >
      {busy ? <ActivityIndicator size="small" color={colors.primaryContrast} /> : null}
      <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 14 }}>
        {busy ? 'Patientez…' : label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase' },
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
  inputMultiline: { minHeight: 76, textAlignVertical: 'top' },
  inputSecure: { paddingRight: 44 },
  eye: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  error: { fontSize: 12 },
  submit: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
  },
});
