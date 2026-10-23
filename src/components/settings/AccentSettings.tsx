import { useState } from 'react';

import { accentPresets, getAccent, setAccent } from '../../theme/theme';

/** Choix de la couleur d'accentuation (paramètres et file d'attente). */
export function AccentSettings() {
  const [accent, setAccentState] = useState(getAccent());

  return (
    <div className="px-4 py-4">
      <p className="mb-2 text-sm font-semibold text-white">Couleur d'accentuation</p>
      <div className="flex flex-wrap gap-2">
        {accentPresets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            title={preset.name}
            aria-label={preset.name}
            onClick={() => {
              setAccent(preset.value);
              setAccentState(preset.value);
            }}
            style={{ backgroundColor: preset.value }}
            className={`h-8 w-8 rounded-full border-2 transition ${
              accent === preset.value ? 'scale-110 border-white' : 'border-transparent'
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        Change la couleur primaire de l'interface (le vert Spotify par défaut).
      </p>
    </div>
  );
}
