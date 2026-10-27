import { MAX_CROSSFADE_SECONDS, MIN_CROSSFADE_SECONDS } from '../../audio/crossfade';
import { usePlayer } from '../../store/playerStore';
import type { TransitionMode } from '../../types/music';

const OPTIONS: Array<{ id: TransitionMode; label: string; hint: string }> = [
  { id: 'off', label: 'Désactivé', hint: 'Les titres s’enchaînent sans fondu.' },
  {
    id: 'automix',
    label: 'AutoMix',
    hint: 'Fondu beatmatché d’environ 10 s, avec échange de basses.',
  },
  {
    id: 'crossfade',
    label: 'Fondu enchaîné',
    hint: 'Fondu simple de durée fixe, sans beat-match.',
  },
];

const PRESETS = [4, 8, 12];

/** Réglages de transition façon Apple Music : Off / AutoMix / Crossfade. */
export function TransitionSettings() {
  const transitionStyle = usePlayer((s) => s.transitionStyle);
  const setTransitionStyle = usePlayer((s) => s.setTransitionStyle);
  const crossfadeSeconds = usePlayer((s) => s.crossfadeSeconds);
  const setCrossfadeSeconds = usePlayer((s) => s.setCrossfadeSeconds);

  return (
    <div className="px-4 py-4">
      <p className="text-sm font-semibold text-white">Transitions entre titres</p>
      <p className="mb-3 mt-1 text-xs text-muted">
        Comme dans Apple Music : l’AutoMix dure environ 10 s et se cale sur les phrases ; seul
        le fondu enchaîné se règle à la main.
      </p>

      <div role="radiogroup" aria-label="Transition entre titres" className="space-y-2">
        {OPTIONS.map((option) => {
          const selected = transitionStyle === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTransitionStyle(option.id)}
              className={`rounded-card border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-primary bg-primary/15'
                  : 'border-line hover:border-primary/50'
              }`}
            >
              <span className={`block text-sm font-semibold ${selected ? 'text-primary' : 'text-white'}`}>
                {option.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {transitionStyle === 'crossfade' && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="crossfade-duration" className="text-sm font-semibold text-white">
              Durée du fondu
            </label>
            <span className="text-sm font-bold text-primary">{crossfadeSeconds}s</span>
          </div>

          <input
            id="crossfade-duration"
            type="range"
            min={MIN_CROSSFADE_SECONDS}
            max={MAX_CROSSFADE_SECONDS}
            step={1}
            value={crossfadeSeconds}
            onChange={(event) => setCrossfadeSeconds(Number(event.target.value))}
            aria-label="Durée du fondu en secondes"
            className="w-full accent-primary"
          />

          <div className="mt-1 flex justify-between text-[11px] text-muted">
            <span>{MIN_CROSSFADE_SECONDS}s</span>
            <span>{MAX_CROSSFADE_SECONDS}s — fondu long</span>
          </div>

          <div className="mt-3 flex gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setCrossfadeSeconds(preset)}
                className={`flex-1 rounded-card border px-2 py-1.5 text-xs font-medium transition ${
                  crossfadeSeconds === preset
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-line text-subtle hover:text-white'
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
        </div>
      )}

      {transitionStyle === 'automix' && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          L’AutoMix dure environ 10 s, aligne tempo et mesures, puis échange les basses au milieu
          du fondu. Il s’efface quand la paire ne s’y prête pas : album lu dans l’ordre, tempo,
          genre ou tonalité incompatibles. Le silence final des fichiers est sauté.
        </p>
      )}
    </div>
  );
}
