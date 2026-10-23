import { useState, type FormEvent } from 'react';
import { Headphones, Loader2, Mic2 } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { Logo } from '../Logo/Logo';
import { ArtistRegister } from './ArtistRegister';
import { Divider, GoogleButton } from './GoogleButton';
import { UserRegister } from './UserRegister';
import { EMAIL_PATTERN } from './authValidation';
import { inputClass, labelClass } from './authStyles';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
}

type Portal = 'auditeur' | 'artiste';
type Mode = 'login' | 'register';

const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'login', label: 'Connexion' },
  { id: 'register', label: 'Inscription' },
];

/** Point d'entrée : espace auditeur et espace artiste séparés. */
export function AuthScreen({ initialMode = 'login' }: AuthScreenProps) {
  const [portal, setPortal] = useState<Portal>('auditeur');
  const [mode, setMode] = useState<Mode>(initialMode);
  const clearError = useAuthStore((s) => s.clearError);

  const switchPortal = (next: Portal) => {
    clearError();
    setPortal(next);
  };

  const switchMode = (next: Mode) => {
    clearError();
    setMode(next);
  };

  return (
    <div className="bg-grid h-full overflow-y-auto bg-bg">
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Logo size={40} />
            <p className="max-w-sm text-sm text-muted">
              {portal === 'artiste'
                ? 'Ton espace artiste : publie tes morceaux et gère ton profil public.'
                : 'Retrouve ton catalogue, tes favoris et tes mix.'}
            </p>
          </div>

          <div
            role="group"
            aria-label="Type de compte"
            className="mb-4 grid grid-cols-2 gap-1 rounded-full border border-line bg-panel p-1"
          >
            <PortalButton
              active={portal === 'auditeur'}
              onClick={() => switchPortal('auditeur')}
              icon={Headphones}
              label="Auditeur"
            />
            <PortalButton
              active={portal === 'artiste'}
              onClick={() => switchPortal('artiste')}
              icon={Mic2}
              label="Artiste"
            />
          </div>

          <div className="rounded-panel bg-panel p-6">
            <div
              role="group"
              aria-label="Connexion ou inscription"
              className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-elevated p-1"
            >
              {MODES.map((item) => {
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchMode(item.id)}
                    aria-pressed={active}
                    className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                      active ? 'bg-primary text-black' : 'text-muted hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {portal === 'auditeur' && mode === 'login' && <LoginForm />}
            {portal === 'auditeur' && mode === 'register' && <UserRegister />}
            {portal === 'artiste' && mode === 'login' && <LoginForm artist />}
            {portal === 'artiste' && mode === 'register' && <ArtistRegister />}
          </div>

          {portal === 'artiste' && (
            <p className="mt-4 text-center text-xs leading-snug text-muted">
              Les comptes artistes se créent par email. Un compte Google ? Connecte-toi via
              l'espace auditeur, puis ouvre ton espace artiste.
            </p>
          )}

          <p className="mt-4 text-center text-[11px] text-muted/80">
            En continuant, tu acceptes les conditions d'utilisation de Mixify.
          </p>
        </div>
      </div>
    </div>
  );
}

function PortalButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Headphones;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active ? 'bg-elevated text-white' : 'text-muted hover:text-white'
      }`}
    >
      <Icon size={16} className={active ? 'text-primary' : ''} />
      {label}
    </button>
  );
}

function LoginForm({ artist = false }: { artist?: boolean }) {
  const [step, setStep] = useState<0 | 1>(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (step === 0) {
      if (!EMAIL_PATTERN.test(email.trim())) {
        setLocalError("Format d'email invalide.");
        return;
      }
      clearError();
      setStep(1);
      return;
    }

    login(email.trim(), password, artist ? 'artiste' : undefined).catch(() => undefined);
  };

  const back = () => {
    clearError();
    setLocalError(null);
    setPassword('');
    setStep(0);
  };

  const message = localError || (step === 1 ? error : null);

  return (
    <>
      <h1 className="text-xl font-bold text-white">
        {artist ? 'Connexion artiste' : 'Connexion'}
      </h1>
      <p className="mt-1 text-sm leading-snug text-muted">
        {artist
          ? 'Accède à ton espace artiste, à tes morceaux et à ton profil public.'
          : 'Connecte-toi pour retrouver ton catalogue et tes mix.'}
      </p>

      {step === 0 ? (
        <>
          {!artist && (
            <>
              <GoogleButton />
              <Divider />
            </>
          )}

          <form onSubmit={submit} className="mt-4 flex flex-col gap-3" noValidate>
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

            {message && (
              <p role="alert" className="text-xs leading-snug text-danger">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-50"
            >
              Continuer
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 rounded-card bg-elevated px-3 py-2 text-sm">
            <span className="truncate text-white">{email.trim()}</span>
            <button
              type="button"
              onClick={back}
              disabled={busy}
              className="shrink-0 text-xs font-semibold text-primary transition hover:text-white disabled:opacity-40"
            >
              Modifier
            </button>
          </div>

          <label className={labelClass}>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mot de passe"
              autoComplete="current-password"
              autoFocus
              required
              className={inputClass}
            />
          </label>

          {message && (
            <p role="alert" className="text-xs leading-snug text-danger">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-50"
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            {busy ? 'Un instant…' : artist ? 'Accéder à mon espace' : 'Se connecter'}
          </button>
        </form>
      )}
    </>
  );
}

