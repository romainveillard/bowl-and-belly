import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertIcon, CloseIcon } from "../../icons.js";

const SHOWN_FOR_MS = 5000;

interface Snack {
  message: string;
  /** A second line, such as what was deleted or why something failed. */
  detail?: string;
  action?: { label: string; onClick: () => void };
  /** An error stays until dismissed; only for errors that don't belong to a field. */
  tone?: "info" | "error";
}

const SnackbarContext = createContext<(snack: Snack | string) => void>(() => undefined);

/**
 * Shows a short confirmation, or an error. A new one replaces the one on
 * screen, and its action with it, except that nothing but another error
 * replaces an error.
 */
export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [snack, setSnack] = useState<Snack | null>(null);
  const show = useCallback((next: Snack | string) => {
    const shown = typeof next === "string" ? { message: next } : next;
    setSnack((current) => (current?.tone === "error" && shown.tone !== "error" ? current : shown));
  }, []);

  useEffect(() => {
    if (!snack || snack.tone === "error") {
      return undefined;
    }
    const timer = setTimeout(() => setSnack(null), SHOWN_FOR_MS);
    return () => clearTimeout(timer);
  }, [snack]);

  const error = snack?.tone === "error" ? snack : null;
  const info = error ? null : snack;

  return (
    <SnackbarContext value={show}>
      {children}
      {/* Both regions are always in the page, so that screen readers announce what appears in them. */}
      <div className="snackbar">
        <div role="status">
          {info && (
            <div
              className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl bg-foreground text-[15px] text-card shadow-[0_6px_16px_rgba(31,42,68,0.25)] ${info.action ? "py-2 pr-2 pl-4" : "px-4 desktop:px-[18px]"}`}
            >
              <span className="flex min-w-0 flex-col gap-px">
                <span>{info.message}</span>
                {info.detail && (
                  <span className="truncate text-[13px] text-inverse-muted tabular-nums">
                    {info.detail}
                  </span>
                )}
              </span>
              {info.action && (
                <button
                  type="button"
                  className="h-11 flex-none cursor-pointer rounded-[10px] px-3.5 font-semibold text-accent"
                  onClick={() => {
                    info.action?.onClick();
                    setSnack(null);
                  }}
                >
                  {info.action.label}
                </button>
              )}
            </div>
          )}
        </div>
        <div role="alert">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-danger py-2.5 pr-1.5 pl-3.5 text-card shadow-[0_6px_16px_rgba(31,42,68,0.25)] desktop:w-[min(480px,calc(100vw-32px))] desktop:pl-4">
              <span className="flex flex-none">
                <AlertIcon size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{error.message}</span>
                {error.detail && <span className="text-sm leading-5">{error.detail}</span>}
              </span>
              <button
                type="button"
                aria-label={t("action.dismiss")}
                className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-full"
                onClick={() => setSnack(null)}
              >
                <CloseIcon size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </SnackbarContext>
  );
}
