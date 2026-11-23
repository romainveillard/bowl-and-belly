import { useSyncExternalStore } from "react";

/** "login" once the API refuses the session; "expired" once a proxy in front of the app redirects it. */
export type Access = "ok" | "login" | "expired";

let access: Access = "ok";
const listeners = new Set<() => void>();

export function setAccess(next: Access): void {
  access = next;
  for (const listener of listeners) {
    listener();
  }
}

export function useAccess(): Access {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => access,
  );
}

const unreachableListeners = new Set<() => void>();

/** Calls `listener` whenever the server can't be reached at all. */
export function onUnreachable(listener: () => void): () => void {
  unreachableListeners.add(listener);
  return () => unreachableListeners.delete(listener);
}

/**
 * fetch for the API client. A proxy such as Cloudflare Access answers an
 * expired session with a redirect to its own login. Followed, that
 * cross-origin redirect fails like being offline, so it is caught instead:
 * the browser reports it as an opaque redirect.
 */
export const accessAwareFetch: typeof fetch = async (input, init) => {
  let response: Response;
  try {
    response = await fetch(input, { ...init, redirect: "manual" });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      for (const listener of unreachableListeners) {
        listener();
      }
    }
    throw error;
  }
  if (response.type === "opaqueredirect") {
    setAccess("expired");
  } else if (response.status === 401 && !new URL(response.url).pathname.startsWith("/api/auth")) {
    setAccess("login");
  }
  return response;
};
