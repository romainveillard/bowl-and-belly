import { useCallback, useSyncExternalStore } from "react";
import { usePets, type PetSummary } from "./pets.js";

const KEY = "selectedPetId";
const listeners = new Set<() => void>();

// Per device, like the language: household members may each follow a different pet.
function readStored(): number | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The pet that pet-specific screens follow: the last one chosen on this
 * device, or the first pet when that one is gone or none was chosen yet.
 */
export function useSelectedPet(): {
  pet: PetSummary | undefined;
  select: (petId: number) => void;
} {
  const { data } = usePets();
  const storedId = useSyncExternalStore(subscribe, readStored, () => null);
  const select = useCallback((petId: number) => {
    try {
      localStorage.setItem(KEY, String(petId));
    } catch {
      // Without storage the choice lasts until the page is reloaded.
    }
    for (const listener of listeners) {
      listener();
    }
  }, []);

  const pets = data?.pets ?? [];
  return { pet: pets.find((pet) => pet.id === storedId) ?? pets[0], select };
}
