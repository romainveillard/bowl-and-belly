import { Dialog } from "radix-ui";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BackIcon, CloseIcon } from "../../icons.js";
import { Notice } from "../feedback/Notice.js";
import { dragCloses } from "./sheetDrag.js";
import { useSheetError } from "./sheetErrors.js";

function placeSheet(sheet: HTMLElement, distance: number, settle: boolean) {
  sheet.style.transition = settle ? "transform 200ms ease-out" : "";
  sheet.style.transform = distance > 0 ? `translateY(${distance}px)` : "";
}

/**
 * Pulling a phone sheet down by its header, the sheet's first child, closes
 * it or lets it spring back. The body is left to scroll, and the header's
 * buttons to be tapped. The sheet follows the finger through its style rather
 * than through renders.
 */
function useDragDown(close: () => void) {
  const drag = useRef<{
    sheet: HTMLElement;
    startY: number;
    startedAt: number;
    distance: number;
  } | null>(null);

  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const sheet = event.currentTarget.parentElement;
      const onControl = event.target instanceof Element && event.target.closest("button, a");
      // Matches --breakpoint-desktop, where the sheet is a dialog instead.
      const desktop = window.matchMedia("(width >= 860px)").matches;
      if (!sheet || !event.isPrimary || onControl || desktop) {
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { sheet, startY: event.clientY, startedAt: event.timeStamp, distance: 0 };
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      if (drag.current) {
        drag.current.distance = Math.max(0, event.clientY - drag.current.startY);
        placeSheet(drag.current.sheet, drag.current.distance, false);
      }
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      const ended = drag.current;
      drag.current = null;
      if (!ended) {
        return;
      }
      const elapsed = event.timeStamp - ended.startedAt;
      // Closing sinks the sheet from where the finger left it.
      if (dragCloses(ended.distance, elapsed, ended.sheet.offsetHeight)) {
        close();
      } else {
        placeSheet(ended.sheet, 0, true);
      }
    },
    onPointerCancel: () => {
      if (drag.current) {
        placeSheet(drag.current.sheet, 0, true);
      }
      drag.current = null;
    },
  };
}

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
  /** For a view shown in the sheet's place, returning to what it covers. */
  onBack?: (() => void) | undefined;
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
  onBack,
}: SheetProps) {
  const { t } = useTranslation();
  const error = useSheetError(open);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dragDown = useDragDown(() => onOpenChange(false));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-motion fixed inset-0 z-10 bg-overlay" />
        <Dialog.Content
          aria-describedby={undefined}
          // A form sheet starts on its first field rather than on Close or the
          // pet chip, but only with a mouse and keyboard: on a touch screen a
          // focused field brings up the keyboard, so it starts on the title.
          // A sheet of actions starts on its first action.
          onOpenAutoFocus={(event) => {
            if (!footer) {
              return;
            }
            const start = window.matchMedia("(pointer: fine)").matches
              ? body.current?.querySelector<HTMLElement>("input, select, textarea")
              : heading.current;
            if (start) {
              event.preventDefault();
              start.focus();
            }
          }}
          className={`sheet-motion fixed inset-x-0 bottom-0 z-20 flex max-h-[calc(100dvh-env(safe-area-inset-top)-16px)] flex-col rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] desktop:inset-x-auto desktop:top-24 desktop:bottom-auto desktop:left-1/2 desktop:-translate-x-1/2 desktop:overflow-hidden desktop:rounded-2xl desktop:pb-0 desktop:max-h-[calc(100dvh-128px)] desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)] ${tall ? "top-9 desktop:w-[min(560px,calc(100%-32px))]" : "desktop:w-[min(460px,calc(100%-32px))]"}`}
        >
          <div
            {...dragDown}
            className="flex-none touch-none px-5 pt-2.5 pb-2 desktop:touch-auto desktop:px-6 desktop:pt-5 desktop:pb-3"
          >
            <div
              aria-hidden="true"
              className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-border desktop:hidden"
            />
            <div className="flex items-center justify-between gap-3">
              {onBack && (
                <button
                  type="button"
                  aria-label={t("action.back")}
                  onClick={onBack}
                  className="-mr-2 -ml-3 flex size-11 flex-none cursor-pointer items-center justify-center rounded-full"
                >
                  <BackIcon />
                </button>
              )}
              <div className="mr-auto flex min-w-0 flex-col gap-0.5">
                <Dialog.Title
                  ref={heading}
                  tabIndex={-1}
                  className="truncate font-display text-title font-semibold focus:outline-none desktop:text-2xl"
                >
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
            ref={body}
            className={
              flush
                ? "flex min-h-0 flex-col overflow-y-auto pt-1 pb-6 desktop:pb-3"
                : `flex min-h-0 flex-col gap-2 overflow-y-auto px-5 pt-2 pb-1 desktop:gap-[18px] desktop:px-6 desktop:pt-1 desktop:pb-5 ${tall ? "flex-1 gap-[18px] pt-1 pb-4" : ""}`
            }
          >
            {error && (
              <Notice tone="danger" role="alert">
                <strong>{error.message}</strong> {error.detail}
              </Notice>
            )}
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
