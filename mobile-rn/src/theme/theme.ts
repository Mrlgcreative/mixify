/**
 * Identité visuelle Mixify — mêmes valeurs que front/src/theme/theme.ts.
 * Toute couleur de l'app vient d'ici.
 */
export const colors = {
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
} as const;

export const radius = { card: 10, panel: 16, pill: 999 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/** Échelle typographique globale : texte plus lisible, calé sur Spotify. */
export const fontScale = 1.15;

/** Lien public utilisé par le parrainage et les partages. */
export const PUBLIC_URL = 'https://mixify.imasomo.com';

/** Palette d'accent proposée dans les réglages (comme sur le web). */
export const accentPresets = [
  { name: 'Or Congo', value: '#F3C24B' },
  { name: 'Bleu ciel Congo', value: '#38A3E0' },
  { name: 'Rouge Congo', value: '#E5484D' },
  { name: 'Rose Apple Music', value: '#FA243C' },
  { name: 'Vert', value: '#34C759' },
  { name: 'Violet', value: '#AF52DE' },
] as const;
