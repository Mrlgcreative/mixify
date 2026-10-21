import type { Config } from 'tailwindcss';

/**
 * Les couleurs sont pilotées par des variables CSS (voir src/index.css).
 * src/theme/theme.ts écrit ces variables à l'exécution -> le thème est
 * interchangeable à chaud (ex. remplacer le vert #1DB954 par une autre couleur).
 */
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: rgb('primary'),
        'primary-contrast': rgb('primary-contrast'),
        bg: rgb('bg'),
        panel: rgb('panel'),
        card: rgb('card'),
        elevated: rgb('elevated'),
        line: rgb('line'),
        subtle: rgb('subtle'),
        text: rgb('text'),
        muted: rgb('muted'),
        danger: rgb('danger'),
      },
      borderRadius: {
        card: '8px',
        panel: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgb(var(--primary) / 0.45)',
        card: '0 8px 24px rgb(0 0 0 / 0.45)',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgb(var(--primary) / 0.55)' },
          '50%': { boxShadow: '0 0 18px 4px rgb(var(--primary) / 0.75)' },
        },
        'equalizer': {
          '0%, 100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'neon-pulse': 'neon-pulse 1.8s ease-in-out infinite',
        'equalizer': 'equalizer 0.9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
