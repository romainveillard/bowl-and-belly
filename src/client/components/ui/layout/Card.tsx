import type { ReactNode } from "react";

const sizes = {
  default: "gap-3.5 p-[18px] desktop:gap-4 desktop:p-[22px]",
  /** A small figure, such as an Insights stat tile. */
  compact: "gap-1 p-3.5 desktop:p-[18px]",
};

interface CardProps {
  children: ReactNode;
  className?: string;
  size?: keyof typeof sizes;
  /** Names the card for screen readers when it has no visible heading. */
  label?: string;
}

export function Card({ children, className = "", size = "default", label }: CardProps) {
  return (
    <section
      aria-label={label}
      className={`edge-border flex flex-col rounded-xl bg-card desktop:rounded-[14px] ${sizes[size]} ${className}`}
    >
      {children}
    </section>
  );
}

/** Rows that run to a default card's edges, so swipe and hover colours fill them. */
export const cardEdgeRows =
  "-mx-[18px] -mb-[18px] overflow-hidden rounded-b-xl border-t border-border desktop:-mx-[22px] desktop:-mb-[22px] desktop:rounded-b-[14px]";

interface CardHeadingProps {
  title: string;
  hint?: string | undefined;
  /** Beside the title, such as a link to the full page. */
  action?: ReactNode;
}

export function CardHeading({ title, hint, action }: CardHeadingProps) {
  const heading = (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-[15px] font-semibold desktop:text-base">{title}</h2>
      {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
    </div>
  );
  if (!action) {
    return heading;
  }
  return (
    <div className="flex items-baseline justify-between">
      {heading}
      {action}
    </div>
  );
}
