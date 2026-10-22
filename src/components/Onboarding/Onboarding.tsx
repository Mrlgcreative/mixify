import { useState } from 'react';
import { ArrowRight, AudioLines, Heart, Sparkles } from 'lucide-react';

import { Logo } from '../Logo/Logo';

interface OnboardingProps {
  /** `register` si l'utilisateur termine par « Créer mon compte ». */
  onFinish: (next: 'login' | 'register') => void;
}

const STEPS = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur Mixify',
    text: "Le catalogue indépendant, en entier et sans intermédiaire : les artistes publient leurs morceaux directement ici.",
  },
  {
    icon: AudioLines,
    title: 'Des enchaînements sans coupure',
    text: "Le lecteur précharge le titre suivant, aligne le tempo et enchaîne les morceaux en fondu grâce à l'Auto-Mix.",
  },
  {
    icon: Heart,
    title: 'Ton espace, tes mix',
    text: 'Favoris, playlists et file d’attente te suivent. Artiste ? Publie tes morceaux et suis tes écoutes depuis ton compte.',
  },
];

/** Première visite : trois écrans avant la connexion (l'app est fermée sans compte). */
export function Onboarding({ onFinish }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="bg-grid flex h-full flex-col overflow-y-auto bg-bg">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Logo />
        <button
          type="button"
          onClick={() => onFinish('login')}
          className="text-sm text-muted transition hover:text-white"
        >
          Passer
        </button>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="w-full max-w-md">
          <div className="relative mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Icon size={30} className="text-primary" />
            <span className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Étape {step + 1} / {STEPS.length}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            {current.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-subtle">{current.text}</p>

          <div className="mt-10 flex items-center gap-2" role="group" aria-label="Progression">
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setStep(index)}
                aria-label={`Étape ${index + 1} : ${item.title}`}
                aria-current={index === step ? 'step' : undefined}
                className={`h-1.5 rounded-full transition-all ${
                  index === step ? 'w-8 bg-primary' : 'w-4 bg-line hover:bg-subtle'
                }`}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => (last ? onFinish('register') : setStep(step + 1))}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
            >
              {last ? 'Créer mon compte' : 'Suivant'}
              <ArrowRight size={16} />
            </button>
            {last && (
              <button
                type="button"
                onClick={() => onFinish('login')}
                className="text-sm text-muted transition hover:text-white"
              >
                J’ai déjà un compte
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
