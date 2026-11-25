import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const SHOWN_FOR_MS = 5000;

interface Snack {
  message: string;
  /** A second, muted line, such as what was deleted. */
  detail?: string;
  action?: { label: string; onClick: () => void };
}

const SnackbarContext = createContext<(snack: Snack | string) => void>(() => undefined);

/** Shows a short confirmation; a new one replaces the one on screen, and its action with it. */
export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const show = useCallback(
    (next: Snack | string) => setSnack(typeof next === "string" ? { message: next } : next),
    [],
  );

  useEffect(() => {
    if (!snack) {
      return undefined;
    }
    const timer = setTimeout(() => setSnack(null), SHOWN_FOR_MS);
    return () => clearTimeout(timer);
  }, [snack]);

  return (
    <SnackbarContext value={show}>
      {children}
      {/* Always in the page, so that screen readers announce what appears in it. */}
      <div role="status" className="snackbar">
        {snack && (
          <div
            className={`flex min-h-[52px] items-center justify-between gap-3 rounded-xl bg-foreground text-[15px] text-card shadow-[0_6px_16px_rgba(31,42,68,0.25)] ${snack.action ? "py-2 pr-2 pl-4" : "px-4 desktop:px-[18px]"}`}
          >
            <span className="flex min-w-0 flex-col gap-px">
              <span>{snack.message}</span>
              {snack.detail && (
                <span className="truncate text-[13px] text-inverse-muted tabular-nums">
                  {snack.detail}
                </span>
              )}
            </span>
            {snack.action && (
              <button
                type="button"
                className="h-11 flex-none cursor-pointer rounded-[10px] px-3.5 font-semibold text-accent"
                onClick={() => {
                  snack.action?.onClick();
                  setSnack(null);
                }}
              >
                {snack.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </SnackbarContext>
  );
}
