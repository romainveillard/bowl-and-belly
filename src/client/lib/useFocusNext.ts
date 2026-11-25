import { useEffect, useRef } from "react";

type Find = () => HTMLElement | null | undefined;

/**
 * Moves focus to an element, now or as soon as a render shows it, for a
 * control that takes itself away when used: focus would otherwise fall to
 * the page, and keyboard and screen-reader users lose their place.
 */
export function useFocusNext() {
  const pending = useRef<Find | null>(null);

  useEffect(() => {
    const element = pending.current?.();
    if (element) {
      pending.current = null;
      element.focus();
    }
  });

  return (find: Find) => {
    const element = find();
    if (element) {
      element.focus();
    } else {
      pending.current = find;
    }
  };
}
