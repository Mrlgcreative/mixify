import { useState } from 'react';

import {
  accentPresets,
  getAccent,
  getSimpleMode,
  setAccent,
  setSimpleMode,
} from '../../theme/theme';

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
        Change la couleur primaire de l'interface (or Congo par défaut).
      </p>
    </div>
  );
}

/**
 * Mode simple : coupe le verre, les dégradés et les animations.
 * Utile sur les téléphones d'entrée de gamme et les connexions lentes.
 */
export function SimpleModeToggle() {
  const [simple, setSimpleState] = useState(getSimpleMode());

  const toggle = () => {
    const next = !simple;
    setSimpleMode(next);
    setSimpleState(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={simple}
      onClick={toggle}
      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">Mode simple</span>
        <span className="mt-1 block text-xs text-muted">
          Fonds unis et sans effets, pour les téléphones d'entrée de gamme ou une connexion lente.
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          simple ? 'bg-primary' : 'bg-elevated'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
            simple ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
