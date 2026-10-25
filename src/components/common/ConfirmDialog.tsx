import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  /** Question courte : « Supprimer « Mokili » ? » */
  title: string;
  /** Conséquence de l'action, en une phrase. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructive : bouton rouge et icône d'alerte. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Demande une confirmation : `if (!(await confirm({...}))) return;` */
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm doit être utilisé dans <ConfirmProvider>');
  return confirm;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

/** Boîte de dialogue de confirmation unique, partagée par toute l'application. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const close = useCallback(
    (value: boolean) => {
      setPending((current) => {
        current?.resolve(value);
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, close]);

  const options = pending?.options;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby={options.description ? 'confirm-dialog-description' : undefined}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-panel border border-line bg-card p-5 shadow-card"
          >
            <div className="flex items-start gap-3">
              {options.danger && (
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
                  <AlertTriangle size={18} />
                </span>
              )}
              <div className="min-w-0">
                <h2 id="confirm-dialog-title" className="text-base font-semibold text-white">
                  {options.title}
                </h2>
                {options.description && (
                  <p id="confirm-dialog-description" className="mt-1 text-sm text-muted">
                    {options.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => close(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-white transition hover:bg-elevated"
              >
                {options.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition hover:brightness-110 ${
                  options.danger ? 'bg-danger text-white' : 'bg-primary text-primary-contrast'
                }`}
              >
                {options.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
