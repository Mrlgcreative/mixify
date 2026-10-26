import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Notifications éphémères : `toast.success('…')`, `toast.error('…')`, `toast.info('…')`. */
export function useToast(): ToastApi {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast doit être utilisé dans <ToastProvider>');
  return toast;
}

const DURATION: Record<ToastKind, number> = { success: 3500, info: 4000, error: 6000 };
const MAX_TOASTS = 4;
const STYLES: Record<ToastKind, string> = {
  success: 'border-primary/40',
  error: 'border-danger/40',
  info: 'border-line',
};
const ICONS: Record<ToastKind, typeof Check> = {
  success: Check,
  error: AlertCircle,
  info: Info,
};

let nextId = 1;

/** File de notifications partagée, affichée en haut de l'écran. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++;
      setItems((current) => [...current, { id, kind, message }].slice(-MAX_TOASTS));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION[kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-[120] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-3 sm:items-end sm:px-0"
      >
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              aria-atomic="true"
              className={`animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-card border bg-card/95 px-4 py-3 text-sm shadow-card backdrop-blur ${STYLES[item.kind]}`}
            >
              <Icon
                size={17}
                className={`mt-0.5 shrink-0 ${
                  item.kind === 'success'
                    ? 'text-primary'
                    : item.kind === 'error'
                      ? 'text-danger'
                      : 'text-muted'
                }`}
              />
              <p className="min-w-0 flex-1 text-white">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Fermer la notification"
                className="-mr-1 rounded-full p-1 text-muted transition hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
