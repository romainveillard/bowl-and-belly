import { useEffect } from "react";

const APP_NAME = "Bowl & Belly";

/** "Today · Bowl & Belly", for the tab and history, and for RouteAnnouncer to read out. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) {
      return undefined;
    }
    // Put back what was there, so a profile opened over Pets leaves "Pets".
    const previous = document.title;
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
