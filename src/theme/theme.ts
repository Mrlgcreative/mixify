/**
 * Thème global — c'est le SEUL endroit où les couleurs du produit sont définies.
 * Les valeurs sont converties en variables CSS (`--primary`, `--bg`, ...) puis
 * consommées par Tailwind (voir tailwind.config.ts) et par les composants.
 *
 * Pour changer la couleur primaire (l'or Congo #F3C24B par défaut), il suffit
 * de modifier `theme.colors.primary` : l'UI se met à jour à chaud, sans rebuild.
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
    // Or du drapeau congolais : chaleureux, lisible sur fond sombre.
    primary: '#F3C24B',
    primaryContrast: '#1A1204',
    bg: '#0A0A0B',
    panel: '#111113',
    card: '#17171A',
    elevated: '#232327',
    line: '#2D2D32',
    subtle: '#C7C7CC',
    text: '#FFFFFF',
    muted: '#8E8E93',
    danger: '#E5484D',
  },
  radius: { card: 10, panel: 16 },
  fonts: { sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  logo: { wordmark: 'Mixify' },
};

/** Palette de couleurs d'accent proposée dans les réglages. */
export const accentPresets: Array<{ name: string; value: string }> = [
  { name: 'Or Congo', value: '#F3C24B' },
  { name: 'Bleu ciel Congo', value: '#38A3E0' },
  { name: 'Rouge Congo', value: '#E5484D' },
  { name: 'Rose Apple Music', value: '#FA243C' },
  { name: 'Vert', value: '#34C759' },
  { name: 'Violet', value: '#AF52DE' },
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

/** Change la couleur primaire à chaud (ex. remplacer l'or #F3C24B). */
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

// --------------------------------------------------------------- mode simple

const SIMPLE_KEY = 'mixify.simple';

/**
 * Mode simple : fonds unis, aucun flou ni animation. Pour les téléphones
 * d'entrée de gamme et les connexions lentes (le verre et les animations
 * coûtent cher au GPU).
 */
export function getSimpleMode(): boolean {
  try {
    return localStorage.getItem(SIMPLE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Écrit le mode simple sur <html> : le CSS (`html.simple`) fait le reste. */
export function applySimpleMode(enabled: boolean, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('simple', enabled);
}

/** Active/désactive le mode simple (persisté). */
export function setSimpleMode(enabled: boolean): void {
  try {
    localStorage.setItem(SIMPLE_KEY, enabled ? '1' : '0');
  } catch {
    /* stockage indisponible : le choix ne survivra pas au rechargement */
  }
  applySimpleMode(enabled);
}
