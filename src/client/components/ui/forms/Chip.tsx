import type { ReactNode } from "react";

interface ChipProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

/** A toggle in a row of filters or choices. */
export function Chip({ pressed, onClick, children, className = "" }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`hit-area inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium aria-pressed:border-primary-strong aria-pressed:bg-accent-soft aria-pressed:font-semibold ${className}`}
    >
      {children}
    </button>
  );
}
