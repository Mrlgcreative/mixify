import { useRef } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Rayon horizontal avec flèches de navigation (header sticky). */
export function Carousel({ title, subtitle, children }: CarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="mb-8">
      <header className="mb-3 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-bold text-white hover:underline">{title}</h2>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => scrollByPage(1)}
          className="rounded-full bg-black/40 p-1.5 text-muted transition hover:text-white"
          aria-label="Faire défiler vers la droite"
        >
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="relative">
        <div
          ref={scroller}
          className="scrollbar-thin flex gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {children}
        </div>
        <button
          type="button"
          onClick={() => scrollByPage(-1)}
          className="absolute -left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/70 p-2 text-white shadow-card transition hover:scale-105 md:block"
          aria-label="Faire défiler vers la gauche"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    </section>
  );
}
