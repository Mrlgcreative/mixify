/**
 * Thème global — c'est le SEUL endroit où les couleurs du produit sont définies.
 * Les valeurs sont converties en variables CSS (`--primary`, `--bg`, ...) puis
 * consommées par Tailwind (voir tailwind.config.ts) et par les composants.
 *
 * Pour changer la couleur primaire (le vert #1DB954), il suffit de modifier
 * `theme.colors.primary` : l'UI se met à jour à chaud, sans rebuild.
 */

export interface ThemeColors {
  /** Couleur d'accentuation (boutons, barres actives, dégradés néon). */
  primary: string;
  /** Couleur de texte posée sur `primary`. */
  primaryContrast: string;
  /** Fond de page (le plus profond). */
  bg: string;
  /** Fond des panneaux (sidebar, zone principale). */
  panel: string;
  /** Fond des cartes. */
  card: string;
  /** Fond survolé / éléments interactifs. */
  elevated: string;
  /** Bordures. */
  line: string;
  /** Texte secondaire. */
  subtle: string;
  /** Texte principal. */
  text: string;
  /** Texte atténué (labels, durées). */
  muted: string;
  /** Erreurs / actions destructrices. */
  danger: string;
}

export interface Theme {
  colors: ThemeColors;
  radius: { card: number; panel: number };
  fonts: { sans: string };
  logo: { /** Nom affiché à côté du logo. */ wordmark: string };
}

export const theme: Theme = {
  colors: {
    primary: '#1DB954',
    primaryContrast: '#04140A',
    bg: '#0A0A0A',
    panel: '#121212',
    card: '#181818',
    elevated: '#242424',
    line: '#2A2A2A',
    subtle: '#B3B3B3',
    text: '#FFFFFF',
    muted: '#8A8A8A',
    danger: '#F2545B',
  },
  radius: { card: 8, panel: 12 },
  fonts: { sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  logo: { wordmark: 'Mixify' },
};

/** Palette de reciproches proposée dans les réglages (accent color). */
export const accentPresets: Array<{ name: string; value: string }> = [
  { name: 'Vert Spotify', value: '#1DB954' },
  { name: 'Rose Apple Music', value: '#FA243C' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Cyan', value: '#22D3EE' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Jaune', value: '#FACC15' },
];

const ACCENT_KEY = 'mixify.accent';

/** Couleur d'accentuation courante (persistée). */
export function getAccent(): string {
  try {
    return localStorage.getItem(ACCENT_KEY) ?? theme.colors.primary;
  } catch {
    return theme.colors.primary;
  }
}

/** Change la couleur primaire à chaud (ex. remplacer le vert #1DB954). */
export function setAccent(color: string): void {
  try {
    localStorage.setItem(ACCENT_KEY, color);
  } catch {
    /* stockage indisponible : on ignore */
  }
  applyTheme({ ...theme, colors: { ...theme.colors, primary: color } });
}

/** #RRGGBB -> "r g b" (format attendu par les variables CSS rgb(var(--x) / a)). */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return '0 0 0';
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/**
 * Écrit le thème dans les variables CSS du document.
 * Les composants ne lisent jamais `theme.colors` directement : ils lisent les
 * classes Tailwind, ce qui garantit que le re-theming est instantané.
 */
export function applyTheme(next: Theme = theme, root: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(next.colors)) {
    root.style.setProperty(`--${kebab(key)}`, hexToRgbTriplet(value));
  }
  root.style.setProperty('--radius-card', `${next.radius.card}px`);
  root.style.setProperty('--radius-panel', `${next.radius.panel}px`);
  root.style.setProperty('--font-sans', next.fonts.sans);
}

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
