import { useEffect, useRef } from "react";

/**
 * Puts focus back on what opened a run of sheets once the last of them closes.
 * Radix returns focus to whatever had it when each sheet opened, which, when
 * one sheet hands over to the next, is a button in the sheet just removed.
 *
 * Call the returned function as the first sheet opens, before focus moves into it.
 */
export function useFocusReturn(open: boolean): () => void {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const target = opener.current;
    if (open || !target) {
      return;
    }
    opener.current = null;
    // A deleted row is gone; the snackbar's Undo takes focus instead.
    if (target.isConnected) {
      target.focus();
    }
  }, [open]);

  return () => {
    if (!open && document.activeElement instanceof HTMLElement) {
      opener.current = document.activeElement;
    }
  };
}
