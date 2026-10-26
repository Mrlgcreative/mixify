import { useEffect, useRef } from 'react';
import { RotateCw, SearchX, TriangleAlert, WifiOff } from 'lucide-react';

import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface ErrorStateProps {
  /** Ce qui n'a pas pu être chargé (« Bibliothèque indisponible », …). */
  title?: string;
  /** Message renvoyé par l'API. */
  error?: string | null;
  /** Le contenu demandé n'existe pas (404 ou élément absent). */
  notFound?: boolean;
  /** Relance le chargement ; réessaie aussi au retour du réseau. */
  onRetry?: () => void;
}

/** Page d'erreur commune : hors ligne, contenu introuvable ou service indisponible. */
export function ErrorState({ title, error, notFound, onRetry }: ErrorStateProps) {
  const online = useOnlineStatus();
  const wasOnline = useRef(online);

  // Retour du réseau : recharge tout seul la page en erreur.
  useEffect(() => {
    if (online && !wasOnline.current) onRetry?.();
    wasOnline.current = online;
  }, [online, onRetry]);

  const offline = !online;
  const Icon = offline ? WifiOff : notFound ? SearchX : TriangleAlert;
  const heading = offline
    ? 'Vous êtes hors ligne'
    : notFound
      ? 'Page introuvable'
      : (title ?? 'Impossible de charger la page');
  const detail = offline
    ? 'Vérifiez votre connexion Internet : la page se rechargera dès que le réseau sera de retour.'
    : notFound
      ? "Ce contenu n'existe plus ou n'est pas accessible."
      : (error ?? 'Une erreur inattendue est survenue.');

  return (
    <section
      role="alert"
      className="mx-auto flex max-w-sm flex-col items-center rounded-panel border border-line bg-card px-6 py-10 text-center"
    >
      <span
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          offline ? 'bg-elevated text-muted' : 'bg-danger/10 text-danger'
        }`}
      >
        <Icon size={22} aria-hidden />
      </span>
      <h2 className="text-lg font-bold text-white">{heading}</h2>
      <p className="mt-2 text-sm text-muted">{detail}</p>
      {onRetry && !notFound && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-contrast transition hover:brightness-110"
        >
          <RotateCw size={15} /> Réessayer
        </button>
      )}
    </section>
  );
}
