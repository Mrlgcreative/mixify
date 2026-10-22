import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { EMAIL_PATTERN, MIN_AGE, ageAt, maxBirthDate } from './authValidation';
import { inputClass, labelClass } from './authStyles';

const STEPS = [
  {
    title: 'Ton compte',
    hint: 'Un email et un mot de passe pour sécuriser ton espace artiste.',
  },
  {
    title: 'Ton identité',
    hint: 'Ton nom public et ta date de naissance (13 ans minimum).',
  },
  {
    title: 'Ton profil artiste',
    hint: 'Ces informations apparaîtront sur ton profil. Tout est modifiable plus tard.',
  },
];

/** Inscription artiste en trois étapes : compte, identité, profil public. */
export function ArtistRegister() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('');
  const [genres, setGenres] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const register = useAuthStore((s) => s.register);
  const clearError = useAuthStore((s) => s.clearError);

  const goTo = (next: number) => {
    setLocalError(null);
    clearError();
    setStep(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    clearError();

    if (step === 0) {
      if (!EMAIL_PATTERN.test(email.trim())) {
        setLocalError("Format d'email invalide.");
        return;
      }
      if (password.length < 6) {
        setLocalError('Le mot de passe doit contenir au moins 6 caractères.');
        return;
      }
      if (password !== confirm) {
        setLocalError('Les deux mots de passe ne correspondent pas.');
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!name.trim()) {
        setLocalError("Indique ton nom d'artiste.");
        return;
      }
      const age = birthDate ? ageAt(birthDate) : null;
      if (age === null) {
        setLocalError('Indique une date de naissance valide.');
        return;
      }
      if (age < MIN_AGE) {
        setLocalError(`Tu dois avoir au moins ${MIN_AGE} ans pour créer un compte artiste.`);
        return;
      }
      if (age > 120) {
        setLocalError('Indique une date de naissance valide.');
        return;
      }
      setStep(2);
      return;
    }

    register({
      email: email.trim(),
      password,
      name: name.trim(),
      role: 'artiste',
      birthDate,
      artist: {
        genres: genres.trim() || undefined,
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        websiteUrl: website.trim() || undefined,
      },
    }).catch(() => undefined);
  };

  const message = localError || error;

  return (
    <>
      <h1 className="text-xl font-bold text-white">Créer un compte artiste</h1>
      <p className="mt-1 text-sm leading-snug text-muted">{STEPS[step].hint}</p>

      <div className="mt-5">
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= step ? 'bg-primary' : 'bg-line'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wide text-muted">
          Étape {step + 1} sur {STEPS.length} · {STEPS[step].title}
        </p>
      </div>

      <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate>
        {step === 0 && (
          <>
            <label className={labelClass}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="toi@exemple.com"
                autoComplete="email"
                autoFocus
                required
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="6 caractères minimum"
                autoComplete="new-password"
                minLength={6}
                required
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Confirmer le mot de passe
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Répète le mot de passe"
                autoComplete="new-password"
                required
                className={inputClass}
              />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <label className={labelClass}>
              Nom de scène
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ton nom d'artiste"
                autoComplete="nickname"
                autoFocus
                required
                className={inputClass}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Date de naissance
                <input
                  type="date"
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  min="1900-01-01"
                  max={maxBirthDate()}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Pays
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="France"
                  autoComplete="country-name"
                  className={inputClass}
                />
              </label>
            </div>
            <p className="text-[11px] leading-snug text-muted">
              La date de naissance sert à vérifier l'âge minimum. Elle n'est pas affichée
              publiquement.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <label className={labelClass}>
              Genres (séparés par des virgules)
              <input
                value={genres}
                onChange={(event) => setGenres(event.target.value)}
                placeholder="rap, soul, electro"
                autoFocus
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Bio
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                rows={3}
                placeholder="Quelques mots sur ton univers musical…"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Site web
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
          </>
        )}

        {message && (
          <p role="alert" className="text-xs leading-snug text-danger">
            {message}
          </p>
        )}

        <div className="mt-1 flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-semibold text-muted transition hover:text-white disabled:opacity-40"
            >
              <ArrowLeft size={15} /> Retour
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="ml-auto flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy
              ? 'Un instant…'
              : step < 2
                ? 'Continuer'
                : 'Créer mon compte artiste'}
            {!busy && step < 2 && <ArrowRight size={15} />}
          </button>
        </div>
      </form>
    </>
  );
}
