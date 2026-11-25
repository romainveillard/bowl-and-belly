import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";
import { setAccess } from "./access.js";

const auth = api.api.auth;

export function useAuth() {
  return useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const response = await auth.$get();
      if (!response.ok) {
        throw new Error("Could not check the session");
      }
      return response.json();
    },
  });
}

/** Resolves to the refusal's code, or null once logged in. */
export function useLogIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const response = await auth.login.$post({ json: { password } });
      if (response.status === 401 || response.status === 429) {
        return (await response.json()).code;
      }
      if (!response.ok) {
        throw new Error("Could not log in");
      }
      return null;
    },
    onSuccess: async (refusal) => {
      if (refusal === null) {
        setAccess("ok");
        await queryClient.resetQueries();
      }
    },
  });
}

export function useLogOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await auth.logout.$post();
      if (!response.ok) {
        throw new Error("Could not log out");
      }
    },
    onSuccess: () => {
      setAccess("login");
      queryClient.clear();
    },
  });
}
