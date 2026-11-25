import { useEffect, useState } from "react";

export interface SheetError {
  message: string;
  detail: string;
}

/** The open sheets' error setters, the one on top last. */
const openSheets: ((error: SheetError) => void)[] = [];

/**
 * Shows a failed save in the sheet on top, if one is open. A snackbar would
 * sit behind the sheet, where it can be neither reached nor dismissed.
 */
export function reportInOpenSheet(error: SheetError): boolean {
  const top = openSheets.at(-1);
  top?.(error);
  return top !== undefined;
}

/** The error to show in a sheet while it is open, cleared when it closes. */
export function useSheetError(open: boolean): SheetError | null {
  const [error, setError] = useState<SheetError | null>(null);
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    openSheets.push(setError);
    return () => {
      openSheets.splice(openSheets.indexOf(setError), 1);
      setError(null);
    };
  }, [open]);
  return error;
}
