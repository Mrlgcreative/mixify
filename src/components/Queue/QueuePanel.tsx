import { Settings2, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { TransitionSettings } from '../AutoMix/TransitionSettings';
import { TrackList } from '../common/TrackList';
import { AccentSettings } from '../settings/AccentSettings';
import { usePlayer } from '../../store/playerStore';

type Tab = 'queue' | 'settings';

/** Panneau latéral : file d'attente (réorganisable) + réglages. */
export function QueuePanel() {
  const [tab, setTab] = useState<Tab>('queue');
  const queue = usePlayer((s) => s.queue);
  const toggleQueue = usePlayer((s) => s.toggleQueue);
  const clearQueue = usePlayer((s) => s.clearQueue);

  return (
    <aside className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-panel pb-[env(safe-area-inset-bottom)] lg:static lg:z-auto lg:w-[320px] lg:shrink-0 lg:rounded-panel lg:pb-0">
      <header className="flex items-center gap-1 border-b border-line px-3 py-2">
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={`rounded-card px-3 py-1.5 text-sm font-semibold transition ${
            tab === 'queue' ? 'bg-elevated text-white' : 'text-muted hover:text-white'
          }`}
        >
          File d'attente
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex items-center gap-1.5 rounded-card px-3 py-1.5 text-sm font-semibold transition ${
            tab === 'settings' ? 'bg-elevated text-white' : 'text-muted hover:text-white'
          }`}
        >
          <Settings2 size={14} />
          Réglages
        </button>
        <button
          type="button"
          onClick={toggleQueue}
          aria-label="Fermer le panneau"
          className="ml-auto rounded-full p-1.5 text-muted transition hover:text-white"
        >
          <X size={16} />
        </button>
      </header>

      {tab === 'queue' ? (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <div className="flex items-center justify-between px-2 pb-2">
            <p className="text-xs text-muted">
              Glissez les titres pour réorganiser · {queue.length} en file
            </p>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                aria-label="Vider la file d'attente"
                className="text-muted transition hover:text-danger"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              La file est vide. Lancez un titre depuis l'accueil.
            </p>
          ) : (
            <TrackList tracks={queue} sortable />
          )}
        </div>
      ) : (
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <TransitionSettings />

          <div className="border-t border-line">
            <AccentSettings />
          </div>
        </div>
      )}
    </aside>
  );
}
