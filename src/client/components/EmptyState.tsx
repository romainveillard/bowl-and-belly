import type { ReactNode } from "react";
import { Link } from "react-router";
import { PlusIcon } from "./icons.js";
import { button } from "./ui/button.js";

interface EmptyStateProps {
  /** The tab's own title, shown above the message as on its normal screen. */
  heading: string;
  icon: ReactNode;
  title: string;
  body: string;
  /** A link to `to`, or a button running `onClick`. */
  action: { label: string } & ({ to: string } | { onClick: () => void });
  /** Shown under the message, such as a link to archived items. */
  footer?: ReactNode;
}

const actionClass = `${button.primary} mt-1.5 h-12 rounded-full px-[22px]`;

/** A tab with nothing to show yet: centred on a phone, in a card on desktop. */
export function EmptyState({ heading, icon, title, body, action, footer }: EmptyStateProps) {
  return (
    <div className="flex min-h-[calc(100dvh-68px-env(safe-area-inset-bottom))] flex-col desktop:min-h-0 desktop:gap-6">
      <header className="px-5 pt-5 pb-3 desktop:p-0">
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {heading}
        </h1>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-7 pb-[60px] text-center desktop:flex-none desktop:rounded-[14px] desktop:bg-card desktop:px-8 desktop:py-20 desktop:inset-ring desktop:inset-ring-border">
        <span
          aria-hidden="true"
          className="flex size-[60px] items-center justify-center rounded-[18px] bg-accent-soft text-primary-strong desktop:size-[72px]"
        >
          {icon}
        </span>
        <h2 className="mt-1.5 font-display text-title font-semibold desktop:text-[26px]">
          {title}
        </h2>
        <p className="max-w-[280px] text-[15px] leading-[22px] text-muted-foreground desktop:max-w-[400px] desktop:text-base desktop:leading-6">
          {body}
        </p>
        {"to" in action ? (
          <Link to={action.to} className={actionClass}>
            <PlusIcon size={18} />
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClass}>
            <PlusIcon size={18} />
            {action.label}
          </button>
        )}
      </section>
      {footer && <div className="px-5 desktop:p-0">{footer}</div>}
    </div>
  );
}
