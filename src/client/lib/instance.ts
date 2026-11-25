import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../api.js";

function useInstance() {
  return useQuery({
    queryKey: ["instance"],
    queryFn: async () => {
      const response = await api.api.instance.$get();
      if (!response.ok) {
        throw new Error("Could not load the instance");
      }
      return response.json();
    },
    staleTime: Infinity,
  });
}

/** Whether this is the public demo, which hides uploads, backups and logging out. */
export function useDemo(): boolean {
  return useInstance().data?.demo ?? false;
}

/** Loads Cloudflare Web Analytics on a demo that has a token for it. */
export function useDemoAnalytics(): void {
  const token = useInstance().data?.analyticsToken;
  useEffect(() => {
    // Development's strict mode runs effects twice.
    if (!token || document.querySelector("script[data-cf-beacon]")) {
      return;
    }
    const beacon = document.createElement("script");
    beacon.defer = true;
    beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
    // spa counts each screen the router shows, not just the first page load.
    beacon.dataset.cfBeacon = JSON.stringify({ token, spa: true });
    document.head.append(beacon);
  }, [token]);
}
