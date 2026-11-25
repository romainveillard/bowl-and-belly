import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-3.5 rounded-xl bg-card p-[18px] inset-ring inset-ring-border desktop:gap-4 desktop:rounded-[14px] desktop:p-[22px] ${className}`}
    >
      {children}
    </section>
  );
}

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
