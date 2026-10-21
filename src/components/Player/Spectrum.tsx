import { useEffect, useRef } from 'react';

import { engine } from '../../audio/engine';

/**
 * Visualiseur fréquentiel (analyse FFT du deck actif).
 * L'analyseur est branché sur la sortie du deck actif dans le moteur Web Audio.
 */
export function Spectrum() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;

    // frequencyBinCount = fftSize / 2 = 128 (analyser.fftSize = 256).
    const data = new Uint8Array(new ArrayBuffer(128));
    const bars = 48;
    let frame = 0;

    // Le canvas ne comprend pas `var(--primary)` : on résout la variable CSS.
    // Un MutationObserver la met à jour quand le thème change à chaud.
    let primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const observer = new MutationObserver(() => {
      primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    const draw = () => {
      engine.getSpectrum(data);
      const { width, height } = element;
      context.clearRect(0, 0, width, height);

      const barWidth = width / bars;
      for (let i = 0; i < bars; i++) {
        // On ne garde que les basses fréquences : plus lisible sur une petite zone.
        const value = (data[i * 2] ?? 0) / 255;
        const barHeight = Math.max(2, value * height);
        const gradient = context.createLinearGradient(0, height, 0, height - barHeight);
        gradient.addColorStop(0, `rgb(${primary} / 0.35)`);
        gradient.addColorStop(1, `rgb(${primary})`);
        context.fillStyle = gradient;
        context.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight);
      }
      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      width={144}
      height={32}
      aria-hidden="true"
      className="hidden h-8 w-36 opacity-80 lg:block"
    />
  );
}
