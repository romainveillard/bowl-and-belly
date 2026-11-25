import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { ACTIVITY_LEVELS, GOALS } from "../../shared/enums.js";
import { explainTarget } from "../../shared/target.js";
import { button } from "../components/ui/forms/button.js";
import { Select } from "../components/ui/forms/Select.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { PhotoPicker } from "../components/PhotoPicker.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { parsePositive } from "../lib/format.js";
import { useDemo } from "../lib/instance.js";
import { offeredTypes, optionLabel } from "../settings/types.js";
import { birthDateOf, initialPetForm, type PetFormState } from "./petForm.js";
import { useFormErrors, type CheckedField } from "../lib/useFormErrors.js";
import { PetTargetCard } from "./PetTargetCard.js";
import {
  petTypeLabel,
  usePet,
  usePets,
  usePetTypes,
  useSavePet,
  type PetBody,
  type PetDetail,
} from "./pets.js";

type FieldName = "name" | "birth" | "targetWeight" | "weight" | "ownTarget";
type ErrorKey =
  | "name"
  | "birthDate"
  | "birthYear"
  | "age"
  | "targetWeight"
  | "weight"
  | "ownTarget";

/** Top to bottom on the form: the first invalid one takes focus. */
const FIELD_ORDER: FieldName[] = ["name", "birth", "targetWeight", "weight", "ownTarget"];
const BIRTH_ERROR = { exact: "birthDate", year: "birthYear", estimated: "age" } as const;

function PetForm({ pet, today }: { pet: PetDetail | undefined; today: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: petTypes } = usePetTypes();
  const demo = useDemo();
  const save = useSavePet(pet?.id);
  const [form, setForm] = useState(() => initialPetForm(pet, i18n.language));
  const showSnackbar = useSnackbar();
  const set = <Key extends keyof PetFormState>(key: Key, value: PetFormState[Key]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const petTypeId = form.petTypeId ?? petTypes?.[0]?.id ?? null;
  const systemKey = petTypes?.find((type) => type.id === petTypeId)?.systemKey ?? null;
  const birthDate = birthDateOf(form, today, pet);
  const weightKg = parsePositive(form.weight);
  const targetWeightKg = parsePositive(form.targetWeight);
  const ownKcal = parsePositive(form.ownTargetKcal);
  const hasWeightGoal = form.goal !== "maintain";

  const suggestion =
    systemKey && birthDate
      ? explainTarget({
          petType: systemKey,
          birthDate,
          today,
          neutered: form.neutered,
          activityLevel: form.activityLevel,
          goal: form.goal,
          targetWeightG: targetWeightKg === null ? null : Math.round(targetWeightKg * 1000),
          weightG: weightKg === null ? null : Math.round(weightKg * 1000),
        })
      : null;

  // Custom pet types have no formula, so their target is always the user's own.
  const ownTarget = systemKey === null || form.ownTarget;
  const closeLink = pet ? `/pets/${pet.id}` : "/pets";
  const title = pet ? t("pets.edit") : t("pets.add");

  const problems = new Map<FieldName, ErrorKey>();
  if (form.name.trim() === "") {
    problems.set("name", "name");
  }
  if (birthDate === null) {
    problems.set("birth", BIRTH_ERROR[form.ageMode]);
  }
  if (hasWeightGoal && targetWeightKg === null) {
    problems.set("targetWeight", "targetWeight");
  }
  if (form.weight.trim() !== "" && weightKg === null) {
    problems.set("weight", "weight");
  }
  // A custom type may be left without a target; an own target switched on may not.
  if (ownTarget && ownKcal === null && (systemKey !== null || form.ownTargetKcal.trim() !== "")) {
    problems.set("ownTarget", "ownTarget");
  }

  const errors = useFormErrors(problems, FIELD_ORDER, "pet");
  const errorFor = (field: FieldName) => {
    const problem = errors.problemOf(field);
    return problem && t(`petForm.errors.${problem}`);
  };
  const field = (name: FieldName): CheckedField => ({
    id: errors.idOf(name),
    error: errorFor(name),
    onBlur: errors.recheck(name),
  });

  const submit = () => {
    if (errors.reject() || petTypeId === null || birthDate === null) {
      return;
    }
    const body: PetBody = {
      name: form.name,
      petTypeId,
      photoId: form.photoId,
      birthDate,
      birthDatePrecision: form.ageMode,
      neutered: form.neutered,
      activityLevel: form.activityLevel,
      goal: form.goal,
      targetWeightG:
        hasWeightGoal && targetWeightKg !== null ? Math.round(targetWeightKg * 1000) : null,
      weightG: weightKg === null ? null : Math.round(weightKg * 1000),
      manualTargetKcal: ownTarget && ownKcal !== null ? Math.round(ownKcal) : null,
    };
    save.mutate(body, {
      onSuccess: (saved) => {
        void navigate(`/pets/${saved.id}`);
        if (saved.targetKcal !== null) {
          showSnackbar(t("target.changed", { kcal: saved.targetKcal }));
        }
      },
    });
  };

  const saveButton = (className: string) => (
    <button type="button" className={className} disabled={save.isPending} onClick={submit}>
      {t("petForm.save")}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col desktop:min-h-0 desktop:gap-6">
      <SubPageHeader
        title={title}
        phoneLink={{ to: closeLink, label: t("action.close"), close: true }}
        desktopLink={{ to: closeLink, label: t("nav.pets") }}
      />

      <ErrorSummary names={errors.shown.map((problem) => t(`petForm.errorNames.${problem}`))} />

      <div className="grid flex-1 content-start gap-3.5 px-5 pt-1 pb-4 desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          <Card>
            <CardHeading title={t("petForm.details")} />
            {!demo && (
              <PhotoPicker
                shape="round"
                photoId={form.photoId}
                onChange={(photoId) => set("photoId", photoId)}
                label={t("petForm.photo")}
                alt={t("petForm.photo")}
                hint={t("petForm.photoHint")}
              />
            )}
            <div className="flex flex-col gap-3.5 desktop:grid desktop:grid-cols-2 desktop:gap-4">
              <Field
                {...field("name")}
                label={t("petForm.name")}
                value={form.name}
                onChange={(name) => set("name", name)}
              />
              <Select
                label={t("petForm.type")}
                value={petTypeId ?? ""}
                onChange={(value) => set("petTypeId", Number(value))}
              >
                {offeredTypes(petTypes ?? [], pet?.petTypeId).map((type) => (
                  <option key={type.id} value={type.id}>
                    {optionLabel(petTypeLabel(type, t), type, t)}
                  </option>
                ))}
              </Select>
            </div>
          </Card>

          <Card>
            <CardHeading title={t("petForm.age")} />
            <Segmented
              label={t("petForm.ageMode")}
              hideLabel
              value={form.ageMode}
              onChange={(ageMode) => set("ageMode", ageMode)}
              options={[
                { value: "exact", label: t("petForm.birthDate") },
                { value: "year", label: t("petForm.year") },
                { value: "estimated", label: t("petForm.age") },
              ]}
            />
            {form.ageMode === "exact" && (
              <Field
                {...field("birth")}
                label={t("petForm.birthDate")}
                type="date"
                max={today}
                value={form.birthDate}
                onChange={(value) => set("birthDate", value)}
              />
            )}
            {form.ageMode === "year" && (
              <Field
                {...field("birth")}
                label={t("petForm.birthYear")}
                inputMode="numeric"
                value={form.birthYear}
                onChange={(value) => set("birthYear", value)}
              />
            )}
            {form.ageMode === "estimated" && (
              <Field
                {...field("birth")}
                label={t("petForm.age")}
                inputMode="decimal"
                suffix={t("petForm.years")}
                value={form.ageYears}
                onChange={(value) => set("ageYears", value)}
                hint={form.ageYears.trim() && t("petForm.ageHint", { age: form.ageYears.trim() })}
              />
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          <Card>
            <CardHeading title={t("petForm.health")} hint={t("petForm.healthHint")} />
            <Segmented
              label={t("petForm.neutered")}
              value={form.neutered ? "yes" : "no"}
              onChange={(value) => set("neutered", value === "yes")}
              options={[
                { value: "yes", label: t("petForm.yes") },
                { value: "no", label: t("petForm.no") },
              ]}
            />
            <Segmented
              label={t("petForm.activity")}
              value={form.activityLevel}
              onChange={(value) => set("activityLevel", value)}
              options={ACTIVITY_LEVELS.map((value) => ({ value, label: t(`petForm.${value}`) }))}
            />
            <Segmented
              label={t("petForm.goal")}
              value={form.goal}
              onChange={(value) => set("goal", value)}
              options={GOALS.map((value) => ({ value, label: t(`petForm.${value}`) }))}
            />
            {hasWeightGoal && (
              <Field
                {...field("targetWeight")}
                label={t("weight.target")}
                inputMode="decimal"
                suffix={t("weight.kg")}
                value={form.targetWeight}
                onChange={(value) => set("targetWeight", value)}
              />
            )}
          </Card>

          <Card>
            <CardHeading title={t("weight.title")} />
            <Field
              {...field("weight")}
              label={t("weight.current")}
              inputMode="decimal"
              suffix={t("weight.kg")}
              value={form.weight}
              onChange={(value) => set("weight", value)}
            />
          </Card>

          <PetTargetCard
            hasFormula={systemKey !== null}
            suggestion={suggestion}
            goal={form.goal}
            value={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            showOwn={ownTarget}
            field={field("ownTarget")}
          />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] desktop:hidden">
        {saveButton(button.primaryLarge)}
      </div>
      <div className="hidden justify-end gap-2.5 desktop:flex">
        <Link to={closeLink} className={button.outline}>
          {t("action.cancel")}
        </Link>
        {saveButton(button.primary)}
      </div>
    </div>
  );
}

export function PetFormScreen() {
  const params = useParams();
  const petId = params.petId === undefined ? undefined : Number(params.petId);
  const { data: pets } = usePets();
  const { data: pet } = usePet(petId);

  // The form copies the pet into its own state once, so it waits for it.
  if (!pets || (petId !== undefined && !pet)) {
    return null;
  }
  return <PetForm key={petId} pet={pet} today={pets.today} />;
}
