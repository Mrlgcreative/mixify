import { MAX_CROSSFADE_SECONDS, MIN_CROSSFADE_SECONDS } from '../../audio/crossfade';
import { usePlayer } from '../../store/playerStore';

const PRESETS = [0, 4, 8, 12];

/** Réglage de la durée du fondu enchaîné (0 à 12 s). */
export function CrossfadeSettings() {
  const crossfadeSeconds = usePlayer((s) => s.crossfadeSeconds);
  const setCrossfadeSeconds = usePlayer((s) => s.setCrossfadeSeconds);
  const autoMix = usePlayer((s) => s.autoMix);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div>
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
          <span>0s — coupe nette</span>
          <span>12s — fondu long</span>
        </div>
      </div>

      <div className="flex gap-2">
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

      <p className="text-xs leading-relaxed text-muted">
        {autoMix
          ? "L'Auto-Mix aligne le tempo (beat-sync) et les downbeats du titre suivant sur ceux du titre en cours : la transition reste rythmiquement propre."
          : "Activez l'Auto-Mix dans la barre de lecture pour activer les fondus enchaînés."}
      </p>
    </div>
  );
}
