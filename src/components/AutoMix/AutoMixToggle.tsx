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

/** Badge « Mixage » affiché pendant une transition, comme sur Now Playing. */
export function MixingBadge() {
  return (
    <span
      role="status"
      className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
    >
      <EqualizerIcon active />
      Mixage
    </span>
  );
}

/**
 * Bascule AutoMix du lecteur : Off ↔ AutoMix (le Crossfade reste un choix des
 * paramètres). Activée : dégradé néon + halo pulsé.
 */
export function AutoMixToggle() {
  const transitionStyle = usePlayer((s) => s.transitionStyle);
  const setTransitionStyle = usePlayer((s) => s.setTransitionStyle);
  const active = transitionStyle === 'automix';

  return (
    <button
      type="button"
      onClick={() => setTransitionStyle(active ? 'off' : 'automix')}
      aria-pressed={active}
      title={
        active
          ? "Désactiver l'AutoMix"
          : transitionStyle === 'crossfade'
            ? "Passer à l'AutoMix (remplace le fondu enchaîné)"
            : 'Activer l’AutoMix : enchaînement beatmatché, comme Apple Music'
      }
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'animate-neon-pulse border-transparent bg-neon text-white'
          : 'border-line bg-elevated text-subtle hover:text-white'
      }`}
    >
      <Sparkles size={14} />
      <EqualizerIcon active={active} />
      <span className="hidden sm:inline">AutoMix</span>
    </button>
  );
}
