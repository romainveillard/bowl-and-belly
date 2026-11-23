import { useQuery } from "@tanstack/react-query";
import { api } from "../api.js";

/** Whether this is the public demo, which hides uploads, backups and logging out. */
export function useDemo(): boolean {
  const { data } = useQuery({
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
  return data?.demo ?? false;
}
