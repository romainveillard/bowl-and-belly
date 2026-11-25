import type { ReactNode } from "react";

/** The line between rows: above each one but the first. */
export const listRow = "border-t border-border first:border-t-0";

/** A white rounded box of rows. Each row sets its own height and padding, and uses `listRow`. */
export function List({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:rounded-[14px] ${className}`}
    >
      {children}
    </div>
  );
}
