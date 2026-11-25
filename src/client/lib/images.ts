import { useMutation } from "@tanstack/react-query";
import { api } from "../api.js";
import { apiError } from "./apiError.js";

/** Uploads a photo for a pet or food. Resolves to the stored image's id. */
export function useUploadPhoto() {
  return useMutation({
    meta: { failed: "photo" },
    mutationFn: async (photo: File) => {
      const response = await api.api.images.$post({ form: { photo } });
      if (!response.ok) {
        throw await apiError(response);
      }
      return (await response.json()).id;
    },
  });
}
