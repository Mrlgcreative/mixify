interface CoverProps {
  /** Sert de graine : même id => même dégradé. */
  seed: string;
  /** Texte affiché au centre (initiales du titre). */
  title?: string;
  className?: string;
  rounded?: 'card' | 'panel' | 'full';
}

/**
 * Pochette générative : dégradé déterministe dérivé de l'id du titre.
 * Évite d'avoir à charger des images (et le mode démo reste 100 % hors-ligne).
 */
export function Cover({ seed, title, className = '', rounded = 'card' }: CoverProps) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  const hue = hash % 360;
  const angle = 120 + (hash % 60);

  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === 'panel' ? 'rounded-panel' : 'rounded-card';

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${radius} ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, hsl(${hue} 62% 42%), hsl(${(hue + 48) % 360} 55% 18%))`,
      }}
    >
      <span className="font-bold text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
        {(title ?? '')
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase() ?? '')
          .join('')}
      </span>
    </div>
  );
}
