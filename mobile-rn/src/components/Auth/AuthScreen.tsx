import { ChevronLeft, Headphones, Mic2 } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL, requestEmailVerification } from '@/api/musicApi';
import { notify } from '@/lib/dialogs';
import { useAuth } from '@/store/auth';
import { colors, radius } from '@/theme/theme';
import type { AccountRole } from '@/types/auth';
import { Logo } from '../common/Logo/Logo';
import { T } from '../common/T/T';
import { ErrorLine, Field, SubmitButton } from './AuthFields';
import { RegisterForm } from './RegisterForm';

type Mode = 'login' | 'register';

/** Authentification d'un espace précis : artiste ou auditeur, jamais les deux. */
export function AuthScreen({ role, onBack }: { role: AccountRole; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');
  const { clearError } = useAuth();
  const artist = role === 'artiste';
  const url = Linking.useURL();
  // Lien de parrainage `?ref=<code>` (web ou schéma mixify://).
  const referral = useMemo(() => {
    if (!url) return '';
    const { queryParams } = Linking.parse(url);
    const ref = queryParams?.ref;
    return typeof ref === 'string' ? ref : '';
  }, [url]);

  const switchMode = (next: Mode) => {
    clearError();
    setMode(next);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir au choix du profil"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
        >
          <ChevronLeft size={17} color={colors.text} />
          <T weight="semibold" style={{ fontSize: 13 }}>
            Retour
          </T>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.brand}>
            <Logo size={40} />
            <View style={styles.roleBadge}>
              {artist ? (
                <Mic2 size={13} color={colors.primary} />
              ) : (
                <Headphones size={13} color={colors.primary} />
              )}
              <T color={colors.primary} weight="semibold" style={styles.roleBadgeText}>
                {artist ? 'Espace artiste' : 'Espace auditeur'}
              </T>
            </View>
            <T color={colors.muted} style={styles.tagline}>
              {artist
                ? 'Publie tes morceaux et gère ton profil public.'
                : 'Retrouve ton catalogue, tes favoris et tes mix.'}
            </T>
          </View>

          <View style={styles.panel}>
            <View style={styles.modeToggle}>
              {(['login', 'register'] as const).map((item) => {
                const active = mode === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => switchMode(item)}
                    style={[styles.modeButton, active && styles.modeButtonActive]}
                  >
                    <T
                      weight="semibold"
                      color={active ? colors.primaryContrast : colors.muted}
                      style={{ fontSize: 13 }}
                    >
                      {item === 'login' ? 'Connexion' : 'Inscription'}
                    </T>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'login' ? (
              <LoginForm artist={artist} />
            ) : (
              <RegisterForm artist={artist} referral={referral} />
            )}
          </View>

          {artist ? (
            <T color={colors.muted} style={styles.footnote}>
              Les comptes artistes se créent par email. Tu pourras gérer ton catalogue et ton
              parrainage depuis l’onglet Artiste.
            </T>
          ) : null}

          <T color={colors.muted} style={[styles.footnote, { opacity: 0.75 }]}>
            En continuant, tu acceptes les conditions d’utilisation de Mixify.
          </T>
          <View style={styles.legalLinks}>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(`${API_URL}/privacy`).catch(() =>
                  notify('Page inaccessible', 'Vérifie ta connexion puis réessaie.'),
                );
              }}
            >
              <T color={colors.primary} weight="semibold" style={styles.legalLink}>
                Politique de confidentialité
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                void Linking.openURL(`${API_URL}/delete-account`).catch(() =>
                  notify('Page inaccessible', 'Vérifie ta connexion puis réessaie.'),
                );
              }}
            >
              <T color={colors.primary} weight="semibold" style={styles.legalLink}>
                Demander la suppression du compte
              </T>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginForm({ artist }: { artist: boolean }) {
  const { login, busy, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Email et mot de passe requis.');
      return;
    }
    try {
      await login(email, password, artist ? 'artiste' : undefined);
    } catch {
      /* l'erreur est affichée depuis le store */
    }
  };

  const resendVerification = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const result = await requestEmailVerification(email.trim());
      setResendMessage(result.message);
    } catch (cause) {
      setResendMessage(cause instanceof Error ? cause.message : "Impossible d'envoyer l'email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.form}>
      <Field label="Email" value={email} onChange={setEmail} placeholder="toi@exemple.com" keyboardType="email-address" />
      <Field label="Mot de passe" value={password} onChange={setPassword} placeholder="••••••••" secure />
      <ErrorLine message={localError ?? error} />
      <SubmitButton label="Se connecter" busy={busy} onPress={() => void submit()} />
      <Pressable
        accessibilityRole="button"
        disabled={resending || !email.trim()}
        onPress={() => void resendVerification()}
        style={styles.resendButton}
      >
        <T color={colors.primary} weight="semibold" style={styles.legalLink}>
          {resending ? 'Envoi…' : "Renvoyer l'email de vérification"}
        </T>
      </Pressable>
      {resendMessage ? (
        <T color={colors.muted} style={styles.footnote}>{resendMessage}</T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, flexGrow: 1, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  topBar: { paddingHorizontal: 16, paddingBottom: 8 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panel,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 8,
  },
  brand: { alignItems: 'center', gap: 12, marginBottom: 24 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(243,194,75,0.35)',
    backgroundColor: 'rgba(243,194,75,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roleBadgeText: { fontSize: 11, letterSpacing: 0.4 },
  tagline: { fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 19 },
  panel: { backgroundColor: colors.panel, borderRadius: radius.panel, padding: 20 },
  modeToggle: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.elevated,
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
  modeButtonActive: { backgroundColor: colors.primary },
  form: { gap: 14 },
  footnote: { marginTop: 16, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLinks: { alignItems: 'center', gap: 8, marginTop: 14 },
  resendButton: { alignSelf: 'center', paddingVertical: 4 },
  legalLink: { fontSize: 11, textDecorationLine: 'underline' },
});
