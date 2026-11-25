import type { ReactNode } from "react";

/**
 * A tab's floating buttons, bottom right: just above the bottom bar on a
 * phone, in the corner on desktop. The main action goes last.
 */
export function FloatingActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`fixed right-5 bottom-[calc(var(--bottom-bar-height)+18px+env(safe-area-inset-bottom))] flex items-center gap-2.5 desktop:right-8 desktop:bottom-8 ${className}`}
    >
      {children}
    </div>
  );
}
