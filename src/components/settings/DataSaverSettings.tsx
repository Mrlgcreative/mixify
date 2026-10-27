import { useEffect, useState } from 'react';

import { clearDownloads, downloadsSupported, listDownloads, onDownloadsChange } from '../../audio/offline';
import {
  audioQualities,
  getAudioQuality,
  getWifiOnlyDownloads,
  setAudioQuality,
  setWifiOnlyDownloads,
} from '../../utils/dataSaver';

/** Économie de données : qualité audio et téléchargements hors ligne. */
export function DataSaverSettings() {
  const [quality, setQualityState] = useState(getAudioQuality());
  const [wifiOnly, setWifiOnlyState] = useState(getWifiOnlyDownloads());
  const [downloads, setDownloads] = useState(() => listDownloads());

  useEffect(() => onDownloadsChange(() => setDownloads(listDownloads())), []);

  const selected = audioQualities.find((item) => item.value === quality) ?? audioQualities[1];

  return (
    <div className="px-4 py-4">
      <p className="text-sm font-semibold text-white">Mode économie de données</p>
      <p className="mt-1 text-xs text-muted">
        Choisissez la qualité demandée au serveur et préparez vos titres pour l’écoute hors ligne.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Qualité audio">
        {audioQualities.map((item) => (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={quality === item.value}
            onClick={() => {
              setAudioQuality(item.value);
              setQualityState(item.value);
            }}
            className={`rounded-card border px-2 py-2 text-xs font-semibold transition ${
              quality === item.value
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-line text-subtle hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted">{selected.detail}</p>

      <button
        type="button"
        role="switch"
        aria-checked={wifiOnly}
        onClick={() => {
          const next = !wifiOnly;
          setWifiOnlyDownloads(next);
          setWifiOnlyState(next);
        }}
        className="mt-4 flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">Télécharger en Wi-Fi uniquement</span>
          <span className="mt-1 block text-xs text-muted">
            Désactivé par défaut : les téléchargements passent aussi par les données mobiles.
            Activez-le pour les réserver au Wi-Fi.
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            wifiOnly ? 'bg-primary' : 'bg-elevated'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
              wifiOnly ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Hors ligne</p>
          <p className="mt-1 text-xs text-muted">
            {downloads.length === 0
              ? 'Aucun titre téléchargé. Utilisez l’icône de téléchargement dans les listes.'
              : `${downloads.length} titre(s) disponible(s) sans connexion.`}
          </p>
        </div>
        {downloads.length > 0 && (
          <button
            type="button"
            onClick={() => {
              void clearDownloads().then(() => setDownloads([]));
            }}
            className="shrink-0 text-xs font-semibold text-muted transition hover:text-danger"
          >
            Tout supprimer
          </button>
        )}
      </div>

      {!downloadsSupported() && (
        <p className="mt-2 text-[11px] text-danger">
          Ce navigateur ne permet pas le téléchargement hors ligne.
        </p>
      )}
    </div>
  );
}
