import { useCallback, useRef, useState } from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  className?: string;
}

/** Barre de progression / volume : lecture avec la souris et accessible au clavier. */
export function ProgressBar({ value, max, onChange, label = 'Progression', className = '' }: ProgressBarProps) {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = track.current;
      if (!el || max <= 0) return;
      const rect = el.getBoundingClientRect();
      const next = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onChange(next * max);
    },
    [max, onChange],
  );

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      onPointerDown={(event) => {
        if (max <= 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        seekFromEvent(event.clientX);
      }}
      onPointerMove={(event) => {
        if (dragging) seekFromEvent(event.clientX);
      }}
      onPointerUp={(event) => {
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onKeyDown={(event) => {
        if (max <= 0) return;
        const step = max / 20;
        if (event.key === 'ArrowRight') onChange(Math.min(max, value + step));
        else if (event.key === 'ArrowLeft') onChange(Math.max(0, value - step));
        else if (event.key === 'Home') onChange(0);
        else if (event.key === 'End') onChange(max);
        else return;
        event.preventDefault();
      }}
      className={`group relative flex h-4 cursor-pointer items-center ${className}`}
    >
      <div className="h-1 w-full rounded-full bg-elevated group-hover:bg-muted/40">
        <div
          className="relative h-full rounded-full bg-primary"
          style={{ width: `${ratio * 100}%` }}
        >
          <span
            className={`absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow transition ${
              dragging ? 'scale-125' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
