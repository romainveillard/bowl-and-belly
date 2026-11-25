import type { ReactNode } from "react";

/**
 * A tab's floating buttons, bottom right: just above the bottom bar on a
 * phone; on desktop, in line with the content's right edge, so they stay
 * near it on a wide screen, and 32 px from the window when it fills it.
 * The main action goes last.
 */
export function FloatingActions({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  // 40 px is the content column's own padding, so the buttons line up with the cards.
  return (
    <div
      className={`fixed right-5 bottom-[calc(var(--bottom-bar-height)+18px+env(safe-area-inset-bottom))] flex items-center gap-2.5 desktop:right-[max(32px,calc((100%_-_var(--sidebar-width)_-_var(--content-max-width))/2_+_40px))] desktop:bottom-8 ${className}`}
    >
      {children}
    </div>
  );
}
