import { theme } from '../../theme/theme';

interface LogoProps {
  size?: number;
  /** Affiche le nom de la marque à côté du symbole. */
  withWordmark?: boolean;
  /** Texte personnalisé (par défaut : celui du thème). */
  wordmark?: string;
}

/**
 * Logo abstrait et interchangeable.
 * Le symbole est un SVG inline dont les couleurs utilisent les variables CSS
 * du thème : remplacer `theme.colors.primary` suffit à re-teinter la marque.
 * Pour injecter un vrai logo, remplacer le <svg> par une <img src={...} />.
 */
export function Logo({ size = 30, withWordmark = true, wordmark }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role="img"
        aria-label="Mixify"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="mixify-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--primary))" />
            <stop offset="60%" stopColor="rgb(var(--primary) / 0.65)" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Trois barres d'égaliseur : le clignotement animé est fait en CSS. */}
        <rect x="3" y="12" width="6" height="14" rx="3" fill="url(#mixify-logo-gradient)" opacity="0.65" />
        <rect x="13" y="4" width="6" height="22" rx="3" fill="url(#mixify-logo-gradient)" />
        <rect x="23" y="9" width="6" height="17" rx="3" fill="url(#mixify-logo-gradient)" opacity="0.8" />
      </svg>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-white">{wordmark ?? theme.logo.wordmark}</span>
      )}
    </div>
  );
}
