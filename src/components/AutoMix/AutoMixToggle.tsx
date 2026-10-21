import { Sparkles } from 'lucide-react';

import { usePlayer } from '../../store/playerStore';

/** Icône d'égaliseur animée (indique que le fondu est actif). */
function EqualizerIcon({ active }: { active: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-current ${active ? 'animate-equalizer' : ''}`}
          style={{
            height: '100%',
            transformOrigin: 'bottom',
            animationDelay: `${i * 0.18}s`,
            animationPlayState: active ? 'running' : 'paused',
          }}
        />
      ))}
    </span>
  );
}

/**
 * Bascule Auto-Mix.
 * Activée : dégradé néon + halo pulsé. Désactivée : simple contour discret.
 */
export function AutoMixToggle() {
  const autoMix = usePlayer((s) => s.autoMix);
  const setAutoMix = usePlayer((s) => s.setAutoMix);

  return (
    <button
      type="button"
      onClick={() => setAutoMix(!autoMix)}
      aria-pressed={autoMix}
      title="Auto-Mix : enchaînement automatique avec fondu intelligent"
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        autoMix
          ? 'animate-neon-pulse border-transparent bg-neon text-white'
          : 'border-line bg-elevated text-subtle hover:text-white'
      }`}
    >
      <Sparkles size={14} />
      <EqualizerIcon active={autoMix} />
      <span className="hidden sm:inline">Auto-Mix</span>
    </button>
  );
}
