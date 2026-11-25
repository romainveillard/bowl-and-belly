import type { ReactNode } from "react";

/** The line between rows: above each one but the first. */
export const listRow = "border-t border-border first:border-t-0";

interface RowAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Icon buttons that appear over a row when it is hovered or focused, on
 * desktop only. The row must be a `group`; `className` places them, such as
 * `right-20` to clear the row's figures.
 */
export function RowHoverActions({
  actions,
  className,
}: {
  actions: RowAction[];
  className: string;
}) {
  return (
    <span
      className={`absolute top-1/2 hidden -translate-y-1/2 gap-2 desktop:group-focus-within:flex desktop:group-hover:flex ${className}`}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          aria-label={action.label}
          onClick={action.onClick}
          className={`hit-area flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted ${action.danger ? "text-danger" : ""}`}
        >
          {action.icon}
        </button>
      ))}
    </span>
  );
}

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
