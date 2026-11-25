import { api } from "../api.js";

/** Uploads a photo for a pet or food. Resolves to the stored image's id. */
export async function uploadPhoto(photo: File): Promise<number> {
  const response = await api.api.images.$post({ form: { photo } });
  if (!response.ok) {
    throw new Error("Could not upload the photo");
  }
  return (await response.json()).id;
}
