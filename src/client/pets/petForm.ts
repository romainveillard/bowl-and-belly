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

export type PetFieldName = "name" | "birth" | "targetWeight" | "weight" | "ownTarget";
type PetErrorKey =
  | "name"
  | "birthDate"
  | "birthYear"
  | "age"
  | "targetWeight"
  | "weight"
  | "ownTarget";

/** Top to bottom on the form: the first invalid one takes focus. */
export const PET_FIELD_ORDER: PetFieldName[] = [
  "name",
  "birth",
  "targetWeight",
  "weight",
  "ownTarget",
];
const BIRTH_ERROR = { exact: "birthDate", year: "birthYear", estimated: "age" } as const;

const gramsOf = (kg: number | null) => (kg === null ? null : Math.round(kg * 1000));

/** The form's fields as the API's values: null where one is empty or doesn't parse. */
export function readPetForm(
  form: PetFormState,
  systemKey: string | null,
  today: string,
  original: Born | undefined,
) {
  const ownKcal = parsePositive(form.ownTargetKcal);
  return {
    birthDate: birthDateOf(form, today, original),
    weightG: gramsOf(parsePositive(form.weight)),
    targetWeightG: gramsOf(parsePositive(form.targetWeight)),
    // Custom pet types have no formula, so their target is always the user's own.
    ownTarget: systemKey === null || form.ownTarget,
    ownKcal: ownKcal === null ? null : Math.round(ownKcal),
  };
}

type PetFormValues = ReturnType<typeof readPetForm>;

/** What keeps the form from saving, by field. */
export function petFormProblems(
  form: PetFormState,
  values: PetFormValues,
  systemKey: string | null,
): Map<PetFieldName, PetErrorKey> {
  const problems = new Map<PetFieldName, PetErrorKey>();
  if (form.name.trim() === "") {
    problems.set("name", "name");
  }
  if (values.birthDate === null) {
    problems.set("birth", BIRTH_ERROR[form.ageMode]);
  }
  if (form.goal !== "maintain" && values.targetWeightG === null) {
    problems.set("targetWeight", "targetWeight");
  }
  if (form.weight.trim() !== "" && values.weightG === null) {
    problems.set("weight", "weight");
  }
  // A custom type may be left without a target; an own target switched on may not.
  if (
    values.ownTarget &&
    values.ownKcal === null &&
    (systemKey !== null || form.ownTargetKcal.trim() !== "")
  ) {
    problems.set("ownTarget", "ownTarget");
  }
  return problems;
}

/** The pet to save, or null while the type or birth date is missing. */
export function petBodyOf(
  form: PetFormState,
  values: PetFormValues,
  petTypeId: number | null,
): PetBody | null {
  if (petTypeId === null || values.birthDate === null) {
    return null;
  }
  return {
    name: form.name,
    petTypeId,
    photoId: form.photoId,
    birthDate: values.birthDate,
    birthDatePrecision: form.ageMode,
    neutered: form.neutered,
    activityLevel: form.activityLevel,
    goal: form.goal,
    targetWeightG: form.goal === "maintain" ? null : values.targetWeightG,
    weightG: values.weightG,
    manualTargetKcal: values.ownTarget ? values.ownKcal : null,
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
