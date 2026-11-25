import { Link } from "react-router";
import { ChevronRightIcon } from "./icons.js";

interface ArchivedLinkProps {
  to: string;
  /** "3 archived pets". */
  label: string;
  /** On desktop, a short link rather than a row across the column. */
  compactOnDesktop?: boolean;
}

/** The link under a list to its archived items. */
export function ArchivedLink({ to, label, compactOnDesktop = false }: ArchivedLinkProps) {
  return (
    <Link
      to={to}
      className={`flex min-h-11 items-center justify-between px-1 text-sm text-muted-foreground ${compactOnDesktop ? "desktop:inline-flex desktop:justify-start desktop:gap-1.5 desktop:self-start desktop:px-0" : ""}`}
    >
      {label}
      <ChevronRightIcon size={18} />
    </Link>
  );
}
