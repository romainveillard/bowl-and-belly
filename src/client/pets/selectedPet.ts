import { useCallback, useSyncExternalStore } from "react";
import { usePets, type PetSummary } from "./pets.js";

const KEY = "selectedPetId";
const listeners = new Set<() => void>();
/** The last choice on this page, for when storage is blocked. */
let chosenHere: number | null = null;

// Per device, like the language: household members may each follow a different pet.
function readStored(): number | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === null ? chosenHere : Number(value);
  } catch {
    return chosenHere;
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
    chosenHere = petId;
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
