import type { ReactNode } from "react";
import { Link } from "react-router";
import { PlusIcon } from "./icons.js";
import { button } from "./ui/forms/button.js";
import { PageHeader } from "./ui/layout/PageHeader.js";

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
  /** `large` is the Pets first run: the very first screen of the app. */
  size?: "default" | "large";
}

const sizes = {
  default: {
    section: "gap-3 px-7 pb-[60px]",
    icon: "size-[60px] rounded-[18px] desktop:size-[72px]",
    title: "mt-1.5 text-title desktop:text-[26px]",
    body: "max-w-[280px] desktop:max-w-[400px]",
    action: `${button.primary} mt-1.5 h-12 rounded-full px-[22px]`,
    plus: 18,
  },
  large: {
    section: "gap-3.5 px-8 pb-10",
    icon: "size-24 flex-none rounded-full desktop:size-28",
    title: "mt-2 text-2xl desktop:text-[28px]",
    body: "max-w-[300px] desktop:max-w-[420px]",
    action: `${button.floating} mt-2 h-[52px] shadow-none desktop:px-[26px]`,
    plus: 20,
  },
};

/** A tab with nothing to show yet: centred on a phone, in a card on desktop. */
export function EmptyState({
  heading,
  icon,
  title,
  body,
  action,
  footer,
  size = "default",
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[calc(100dvh-var(--bottom-bar-height)-env(safe-area-inset-bottom))] flex-col desktop:min-h-0 desktop:gap-6">
      <PageHeader title={heading} />
      <EmptyMessage
        size={size}
        picture={
          <span
            aria-hidden="true"
            className={`flex items-center justify-center bg-accent-soft text-primary-strong ${sizes[size].icon}`}
          >
            {icon}
          </span>
        }
        title={title}
        body={body}
        action={action}
      />
      {footer && <div className="px-5 desktop:p-0">{footer}</div>}
    </div>
  );
}

type EmptyMessageProps = Pick<EmptyStateProps, "title" | "body" | "action"> & {
  size: NonNullable<EmptyStateProps["size"]>;
  /** Above the title: an icon in its circle, or the logo. */
  picture: ReactNode;
};

/** The message of an empty state, for a screen that shows it among other things. */
export function EmptyMessage({ size, picture, title, body, action }: EmptyMessageProps) {
  const style = sizes[size];

  return (
    <section
      className={`flex flex-1 flex-col items-center justify-center text-center desktop:flex-none desktop:rounded-[14px] desktop:bg-card desktop:px-8 desktop:py-20 desktop:inset-ring desktop:inset-ring-border ${style.section}`}
    >
      {picture}
      <h2 className={`font-display font-semibold ${style.title}`}>{title}</h2>
      <p
        className={`text-[15px] leading-[22px] text-muted-foreground desktop:text-base desktop:leading-6 ${style.body}`}
      >
        {body}
      </p>
      {"to" in action ? (
        <Link to={action.to} className={style.action}>
          <PlusIcon size={style.plus} />
          {action.label}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={style.action}>
          <PlusIcon size={style.plus} />
          {action.label}
        </button>
      )}
    </section>
  );
}
