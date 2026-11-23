import { useSyncExternalStore } from "react";

// Matches --breakpoint-desktop in styles.css.
const query = "(width >= 860px)";

function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** For the few places where phone and desktop differ in behaviour, not only in layout. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
