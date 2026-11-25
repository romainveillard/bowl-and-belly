import { useEffect } from "react";

const APP_NAME = "Bowl & Belly";

/** "Today · Bowl & Belly", for the tab and history, and for RouteAnnouncer to read out. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) {
      return undefined;
    }
    document.title = `${title} · ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
