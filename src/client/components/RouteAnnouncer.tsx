import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/** "pets" for /pets/2/edit: the tab or area a path belongs to. */
const section = (path: string) => path.split("/")[1] ?? "";

/** Focus is on nothing, or on something removed or hidden by the change of screen. */
function focusLost(): boolean {
  const active = document.activeElement;
  return (
    !(active instanceof HTMLElement) ||
    active === document.body ||
    !active.isConnected ||
    active.getClientRects().length === 0
  );
}

/**
 * After a change of screen, moves focus to the content and reads out the new
 * page title: a single-page app has no page load for a screen reader to
 * announce. It watches the title itself, so a screen that loads its data
 * first is read once it has one. Mounted once, above the layouts, which
 * change between tabs and forms.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [announced, setAnnounced] = useState("");
  // The first screen comes with the page load, which a screen reader reads by itself.
  const previousPath = useRef(pathname);
  const navigated = useRef(false);

  useEffect(() => {
    const previous = previousPath.current;
    if (pathname === previous) {
      return;
    }
    previousPath.current = pathname;
    navigated.current = true;
    // Choosing a pet in the desktop list changes the path but keeps the list, and focus in it.
    if (section(pathname) !== section(previous) || focusLost()) {
      document.getElementById("main")?.focus({ preventScroll: true });
    }
  }, [pathname]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Between two screens the title is briefly the app's name alone.
      if (navigated.current && document.title.includes(" · ")) {
        setAnnounced(document.title);
      }
    });
    // The head rather than the title element, which setting document.title may create.
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announced}
    </div>
  );
}
