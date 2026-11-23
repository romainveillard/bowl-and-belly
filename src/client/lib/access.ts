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

/**
 * fetch for the API client. A proxy such as Cloudflare Access answers an
 * expired session with a redirect to its own login, which the app can't
 * follow from a fetch, so redirects are caught rather than followed.
 */
export const accessAwareFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, { ...init, redirect: "manual" });
  // Browsers hide a redirect they were told not to follow; other clients show the 3xx.
  if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
    setAccess("expired");
  } else if (response.status === 401 && !new URL(response.url).pathname.startsWith("/api/auth")) {
    setAccess("login");
  }
  return response;
};
