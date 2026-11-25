import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "../../icons.js";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Nothing when the sheet's rows are its actions. */
  footer?: ReactNode;
  /** Shown next to the close button, such as the pet chip. */
  headerExtra?: ReactNode;
  /**
   * A form with a long list: nearly full height on a phone with the middle
   * scrolling, and a wider dialog on desktop.
   */
  tall?: boolean;
  /** Rows that run to the sheet's edges, such as a menu. */
  flush?: boolean;
}

/** A bottom sheet on a phone and a dialog near the top of the page on desktop. */
export function Sheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  footer,
  headerExtra,
  tall = false,
  flush = false,
}: SheetProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          className={`fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] desktop:inset-x-auto desktop:top-24 desktop:bottom-auto desktop:left-1/2 desktop:-translate-x-1/2 desktop:overflow-hidden desktop:rounded-2xl desktop:pb-0 desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)] ${tall ? "top-9 desktop:max-h-[calc(100dvh-128px)] desktop:w-[min(560px,calc(100%-32px))]" : "desktop:w-[min(460px,calc(100%-32px))]"}`}
        >
          <div className="flex-none px-5 pt-2.5 pb-2 desktop:px-6 desktop:pt-5 desktop:pb-3">
            <div
              aria-hidden="true"
              className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-border desktop:hidden"
            />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <Dialog.Title className="truncate font-display text-title font-semibold desktop:text-2xl">
                  {title}
                </Dialog.Title>
                {subtitle && (
                  <Dialog.Description className="text-[13px] text-muted-foreground desktop:text-sm">
                    {subtitle}
                  </Dialog.Description>
                )}
              </div>
              <div className="flex flex-none items-center gap-2">
                {headerExtra}
                <Dialog.Close
                  aria-label={t("action.close")}
                  className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full bg-muted"
                >
                  <CloseIcon />
                </Dialog.Close>
              </div>
            </div>
          </div>
          <div
            className={
              flush
                ? "flex flex-col pt-1 pb-6 desktop:pb-3"
                : `flex flex-col gap-2 px-5 pt-2 pb-1 desktop:gap-[18px] desktop:px-6 desktop:pt-1 desktop:pb-5 ${tall ? "min-h-0 flex-1 gap-[18px] overflow-y-auto pt-1 pb-4" : ""}`
            }
          >
            {children}
          </div>
          {footer && (
            <div
              className={`flex flex-none flex-col gap-1 px-5 pt-4 pb-6 desktop:flex-row-reverse desktop:justify-start desktop:gap-2.5 desktop:border-t desktop:border-border desktop:px-6 desktop:py-4 ${tall ? "border-t border-border pt-3" : ""}`}
            >
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
