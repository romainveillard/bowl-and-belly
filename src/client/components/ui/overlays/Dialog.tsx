import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";

const action =
  "inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl text-base font-semibold desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:px-[18px] desktop:text-[15px]";

/** A dialog's buttons: full width and stacked on a phone, side by side on desktop. */
export const dialogButton = {
  primary: `${action} bg-primary`,
  danger: `${action} bg-danger text-card`,
  secondary: `${action} border border-border bg-card`,
};

interface DialogProps {
  open: boolean;
  /** Left out when the dialog must be answered. */
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  /** The main action first: it sits on the right on desktop. */
  actions: ReactNode;
}

/** A question that needs an answer: centred on a phone, near the top on desktop. */
export function Dialog({ open, onOpenChange, title, description, children, actions }: DialogProps) {
  return (
    <AlertDialog.Root open={open} {...(onOpenChange ? { onOpenChange } : {})}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="overlay-motion fixed inset-0 z-10 bg-overlay" />
        <AlertDialog.Content className="dialog-motion fixed inset-x-5 top-1/2 z-20 flex max-h-[calc(100dvh-32px)] -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-[22px] shadow-[0_12px_32px_rgba(31,42,68,0.25)] desktop:inset-x-auto desktop:top-[140px] desktop:left-1/2 desktop:w-[min(460px,calc(100%-32px))] desktop:-translate-x-1/2 desktop:max-h-[calc(100dvh-172px)] desktop:translate-y-0 desktop:gap-[18px] desktop:p-6 desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)]">
          <div className="flex flex-col gap-1.5 desktop:gap-2">
            <AlertDialog.Title className="font-display text-title font-semibold desktop:text-2xl">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-[15px] leading-[22px] text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>
          {children}
          <div className="flex flex-col gap-2 desktop:flex-row-reverse desktop:justify-start desktop:gap-2.5">
            {actions}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
