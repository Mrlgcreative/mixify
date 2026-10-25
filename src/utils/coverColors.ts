/**
 * Couleurs d'ambiance dérivées de la pochette.
 *
 * Pochette générative : mêmes teintes que `Cover` (même graine). Pochette
 * réelle : moyenne des pixels via canvas ; échoue proprement si l'image n'est
 * pas lisible (CORS) et on garde alors les teintes de la graine.
 */

export interface CoverHues {
  hue: number;
  hue2: number;
}

const cache = new Map<string, CoverHues | null>();

/** Teintes du dégradé génératif (identique à `components/common/Cover`). */
export function seedHues(seed: string): CoverHues {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  const hue = hash % 360;
  return { hue, hue2: (hue + 48) % 360 };
}

function hueFromRgb(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const delta = max - min;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}

/** Teintes moyennes d'une image de pochette, ou null si illisible. */
export function imageHues(url: string): Promise<CoverHues | null> {
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);

  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onerror = () => {
      cache.set(url, null);
      resolve(null);
    };
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('canvas indisponible');
        context.drawImage(image, 0, 0, 8, 8);
        const { data } = context.getImageData(0, 0, 8, 8);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 16) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count += 1;
        }
        if (count === 0) throw new Error('image vide');
        const hue = hueFromRgb(r / count, g / count, b / count);
        const hues = { hue, hue2: (hue + 40) % 360 };
        cache.set(url, hues);
        resolve(hues);
      } catch {
        cache.set(url, null);
        resolve(null);
      }
    };
    image.src = url;
  });
}
