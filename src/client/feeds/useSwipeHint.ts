import { useEffect, useState } from "react";

const SWIPE_HINT_KEY = "swipeHintShown";

function swipeHintShown(): boolean {
  try {
    return localStorage.getItem(SWIPE_HINT_KEY) !== null;
  } catch {
    return true;
  }
}

/**
 * Whether the first feed row peeks at its swipe actions: only until this
 * device has listed a feed once.
 */
export function useSwipeHint(hasFeeds: boolean): boolean {
  const [peek] = useState(() => !swipeHintShown());

  useEffect(() => {
    if (hasFeeds) {
      try {
        localStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {
        // The hint shows again next time; harmless.
      }
    }
  }, [hasFeeds]);

  return peek;
}
