import { ageInMonths } from "../../shared/target.js";
import { formatInputNumber, parsePositive } from "../lib/format.js";
import type { PetBody, PetDetail } from "./pets.js";

export type AgeMode = PetBody["birthDatePrecision"];

export interface PetFormState {
  name: string;
  petTypeId: number | null;
  photoId: number | null;
  ageMode: AgeMode;
  birthDate: string;
  birthYear: string;
  ageYears: string;
  neutered: boolean;
  activityLevel: PetBody["activityLevel"];
  goal: PetBody["goal"];
  targetWeight: string;
  weight: string;
  ownTarget: boolean;
  ownTargetKcal: string;
}

const kgText = (weightG: number | null | undefined, locale: string) =>
  weightG ? formatInputNumber(weightG / 1000, locale, 3) : "";

type Born = Pick<PetDetail, "birthDate" | "birthDatePrecision" | "today">;

const ageYearsText = (pet: Born) => String(Math.floor(ageInMonths(pet.birthDate, pet.today) / 12));

/** The pet form's fields for a pet being edited, or blank for a new one. */
export function initialPetForm(pet: PetDetail | undefined, locale: string): PetFormState {
  const target = pet?.targets[0];
  return {
    name: pet?.name ?? "",
    petTypeId: pet?.petTypeId ?? null,
    photoId: pet?.photoId ?? null,
    ageMode: pet?.birthDatePrecision ?? "exact",
    birthDate: pet?.birthDate ?? "",
    birthYear: pet ? pet.birthDate.slice(0, 4) : "",
    ageYears: pet ? ageYearsText(pet) : "",
    neutered: pet?.neutered ?? true,
    activityLevel: pet?.activityLevel ?? "normal",
    goal: pet?.goal ?? "maintain",
    targetWeight: kgText(pet?.targetWeightG, locale),
    weight: kgText(pet?.weights[0]?.weightG, locale),
    ownTarget: target?.source === "manual",
    ownTargetKcal: target?.source === "manual" ? String(target.kcalPerDay) : "",
  };
}

/** The birth date the age section stands for, or null while it is incomplete. */
export function birthDateOf(form: PetFormState, today: string, original: Born | undefined) {
  if (form.ageMode === "exact") {
    return /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) && form.birthDate <= today
      ? form.birthDate
      : null;
  }
  if (form.ageMode === "year") {
    const year = Number(form.birthYear);
    // 1 January, so the age reads as this year minus the birth year.
    const date = `${year}-01-01`;
    return Number.isInteger(year) && year > 1900 && date <= today ? date : null;
  }
  const years = parsePositive(form.ageYears);
  if (years === null) {
    return null;
  }
  // An unchanged estimate keeps its date, so the pet still ages between edits.
  if (original?.birthDatePrecision === "estimated" && form.ageYears === ageYearsText(original)) {
    return original.birthDate;
  }
  const born = new Date(`${today}T00:00:00Z`);
  born.setUTCMonth(born.getUTCMonth() - Math.round(years * 12));
  return born.toISOString().slice(0, 10);
}
