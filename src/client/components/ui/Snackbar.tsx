import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const SHOWN_FOR_MS = 5000;

const SnackbarContext = createContext<(message: string) => void>(() => undefined);

/** Shows a short confirmation; a new one replaces the one on screen. */
export function useSnackbar() {
  return useContext(SnackbarContext);
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snack, setSnack] = useState<{ message: string } | null>(null);
  const show = useCallback((message: string) => setSnack({ message }), []);

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
          <div className="flex min-h-[52px] items-center gap-3 rounded-xl bg-foreground px-4 text-[15px] text-card shadow-[0_6px_16px_rgba(31,42,68,0.25)] desktop:px-[18px]">
            {snack.message}
          </div>
        )}
      </div>
    </SnackbarContext>
  );
}
