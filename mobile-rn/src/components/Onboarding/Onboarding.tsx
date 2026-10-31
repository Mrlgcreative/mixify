import { useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import { AuthScreen } from '@/components/Auth/AuthScreen';
import { useAuth } from '@/store/auth';
import type { AccountRole } from '@/types/auth';
import { RoleStep } from './RoleStep';
import { WelcomeStep } from './WelcomeStep';

type Step = 'welcome' | 'role' | 'auth';

/**
 * Parcours d'entrée : trois écrans d'intro, choix du profil, puis authentification dédiée.
 * Le rôle n'est plus un sélecteur dans le formulaire : chaque espace a son écran.
 */
export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');
  const [role, setRole] = useState<AccountRole>('utilisateur');
  const { clearError } = useAuth();
  // Le listener du parent est posé au montage : les étapes d'inscription,
  // enregistrées plus tard, passent avant lui dans BackHandler.
  const stepRef = useRef(step);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stepRef.current === 'auth') {
        clearError();
        setStep('role');
        return true;
      }
      if (stepRef.current === 'role') {
        setStep('welcome');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [clearError]);

  if (step === 'welcome') return <WelcomeStep onStart={() => setStep('role')} />;

  if (step === 'role') {
    return (
      <RoleStep
        onBack={() => setStep('welcome')}
        onSelect={(next) => {
          clearError();
          setRole(next);
          setStep('auth');
        }}
      />
    );
  }

  return (
    <AuthScreen
      key={role}
      role={role}
      onBack={() => {
        clearError();
        setStep('role');
      }}
    />
  );
}
