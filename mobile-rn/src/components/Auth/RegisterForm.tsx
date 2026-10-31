import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { requestEmailVerification } from '@/api/musicApi';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme/theme';
import { T } from '../common/T/T';
import { ErrorLine, Field, SubmitButton } from './AuthFields';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inscription en plusieurs étapes : identifiants, informations personnelles,
 * puis profil artiste. Le formulaire ne mélange pas les champs des deux espaces.
 */
export function RegisterForm({ artist, referral }: { artist: boolean; referral: string }) {
  const { register, busy, error, clearError } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [referralCode, setReferralCode] = useState(referral);
  const [genres, setGenres] = useState('');
  const [country, setCountry] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const total = artist ? 3 : 2;
  const last = step === total - 1;

  const goBack = useCallback(() => {
    setLocalError(null);
    clearError();
    setStep((value) => Math.max(0, value - 1));
  }, [clearError]);

  // Le retour matériel remonte les étapes avant de quitter l'inscription.
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [step, goBack]);

  const next = () => {
    setLocalError(null);
    clearError();

    if (step === 0) {
      if (!name.trim()) {
        setLocalError(artist ? "Le nom d'artiste est requis." : 'Le pseudo est requis.');
        return;
      }
      if (!EMAIL.test(email.trim())) {
        setLocalError('Adresse email invalide.');
        return;
      }
      if (password.length < 6) {
        setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
    }

    if (step === 1) {
      const date = birthDate.trim();
      if (artist && !date) {
        setLocalError('La date de naissance est requise pour un compte artiste.');
        return;
      }
      if (date && !DATE.test(date)) {
        setLocalError('Date de naissance au format AAAA-MM-JJ.');
        return;
      }
    }

    setStep((value) => Math.min(total - 1, value + 1));
  };

  const submit = async () => {
    setLocalError(null);
    if (!name.trim() || !email.trim() || password.length < 6) {
      setLocalError('Nom, email et mot de passe (6 caractères minimum) requis.');
      return;
    }
    const date = birthDate.trim();
    if (artist && !date) {
      setLocalError('La date de naissance est requise pour un compte artiste.');
      return;
    }
    if (date && !DATE.test(date)) {
      setLocalError('Date de naissance au format AAAA-MM-JJ.');
      return;
    }
    try {
      const needsVerification = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: artist ? 'artiste' : 'utilisateur',
        birthDate: birthDate.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
        artist: artist
          ? {
              genres: genres.trim() || undefined,
              country: country.trim() || undefined,
              websiteUrl: website.trim() || undefined,
              bio: bio.trim() || undefined,
            }
          : undefined,
      });
      setVerificationSent(needsVerification);
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

  if (verificationSent) {
    return (
      <View style={styles.form}>
        <T weight="bold" style={styles.title}>Vérifie ton adresse email</T>
        <T color={colors.muted} style={styles.text}>
          Un lien de confirmation a été envoyé à {email.trim()}. Ouvre-le pour activer ton compte,
          puis reviens ici pour te connecter.
        </T>
        <Pressable
          accessibilityRole="button"
          disabled={resending}
          onPress={() => void resendVerification()}
          style={styles.resendButton}
        >
          <T color={colors.primary} weight="semibold">
            {resending ? 'Envoi…' : "Renvoyer l'email"}
          </T>
        </Pressable>
        {resendMessage ? <T color={colors.muted} style={styles.text}>{resendMessage}</T> : null}
      </View>
    );
  }

  const copy = artist
    ? [
        {
          title: 'Ton compte',
          text: 'Choisis ton nom d’artiste et tes identifiants de connexion.',
        },
        {
          title: 'À propos de toi',
          text: 'La date de naissance est requise pour un compte artiste.',
        },
        {
          title: 'Ton profil artiste',
          text: 'Ces informations seront publiques sur ton profil.',
        },
      ]
    : [
        {
          title: 'Ton compte',
          text: 'Choisis ton pseudo et tes identifiants de connexion.',
        },
        {
          title: 'Dernière étape',
          text: 'Date de naissance et code de parrainage, tous deux facultatifs.',
        },
      ];
  const current = copy[step];

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <T color={colors.primary} weight="semibold" style={styles.kicker}>
          Étape {step + 1} sur {total}
        </T>
        <T weight="bold" style={styles.title}>
          {current.title}
        </T>
        <T color={colors.muted} style={styles.text}>
          {current.text}
        </T>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Progression de l’inscription"
          accessibilityValue={{ min: 1, max: total, now: step + 1 }}
          style={styles.progress}
        >
          {Array.from({ length: total }).map((_, index) => (
            <View
              key={index}
              style={[styles.segment, index <= step && styles.segmentActive]}
            />
          ))}
        </View>
      </View>

      {step === 0 ? (
        <>
          <Field
            label={artist ? "Nom d'artiste" : 'Pseudo'}
            value={name}
            onChange={setName}
            placeholder={artist ? 'Ton nom de scène' : 'Ton pseudo'}
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="toi@exemple.com"
            keyboardType="email-address"
          />
          <Field
            label="Mot de passe"
            value={password}
            onChange={setPassword}
            placeholder="6 caractères minimum"
            secure
          />
        </>
      ) : step === 1 ? (
        <>
          <Field
            label={artist ? 'Date de naissance' : 'Date de naissance (facultatif)'}
            value={birthDate}
            onChange={setBirthDate}
            placeholder="AAAA-MM-JJ"
          />
          <Field
            label="Code de parrainage (facultatif)"
            value={referralCode}
            onChange={setReferralCode}
            placeholder="Code d’un artiste"
          />
        </>
      ) : (
        <>
          <Field
            label="Genres"
            value={genres}
            onChange={setGenres}
            placeholder="rap, rumba, gospel…"
          />
          <Field label="Pays" value={country} onChange={setCountry} placeholder="RDC" />
          <Field label="Site web" value={website} onChange={setWebsite} placeholder="https://…" />
          <Field
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="Quelques mots sur ton univers"
            multiline
          />
        </>
      )}

      <ErrorLine message={localError ?? error} />

      <View style={styles.actions}>
        <SubmitButton
          label={last ? (artist ? 'Créer mon espace' : "S'inscrire") : 'Continuer'}
          busy={last ? busy : false}
          onPress={last ? () => void submit() : next}
        />
        {step > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={goBack}
            hitSlop={8}
            style={styles.previous}
          >
            <ChevronLeft size={15} color={colors.subtle} />
            <T color={colors.subtle} weight="semibold" style={{ fontSize: 12 }}>
              Précédent
            </T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  header: { gap: 4, marginBottom: 2 },
  kicker: { fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { fontSize: 18, letterSpacing: -0.3 },
  text: { fontSize: 11, lineHeight: 16 },
  progress: { flexDirection: 'row', gap: 6, marginTop: 8 },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.elevated,
  },
  segmentActive: { backgroundColor: colors.primary },
  actions: { gap: 10 },
  resendButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  previous: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    alignSelf: 'center',
    paddingVertical: 5,
  },
});
