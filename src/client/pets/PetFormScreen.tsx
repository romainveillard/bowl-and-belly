import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { ACTIVITY_LEVELS, GOALS } from "../../shared/enums.js";
import { explainTarget } from "../../shared/target.js";
import { Select } from "../components/ui/forms/Select.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { FormActions } from "../components/ui/layout/FormActions.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { PhotoPicker } from "../components/PhotoPicker.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { useDemo } from "../lib/instance.js";
import { offeredTypes, optionLabel } from "../settings/types.js";
import {
  initialPetForm,
  PET_FIELD_ORDER,
  petBodyOf,
  petFormProblems,
  readPetForm,
  type PetFieldName,
  type PetFormState,
} from "./petForm.js";
import { useFormErrors, type CheckedField } from "../lib/useFormErrors.js";
import { PetTargetCard } from "./PetTargetCard.js";
import { petTypeLabel, usePet, usePets, usePetTypes, useSavePet, type PetDetail } from "./pets.js";

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
  const values = readPetForm(form, systemKey, today, pet);
  const hasWeightGoal = form.goal !== "maintain";

  const suggestion =
    systemKey && values.birthDate
      ? explainTarget({
          petType: systemKey,
          birthDate: values.birthDate,
          today,
          neutered: form.neutered,
          activityLevel: form.activityLevel,
          goal: form.goal,
          targetWeightG: values.targetWeightG,
          weightG: values.weightG,
        })
      : null;

  const closeLink = pet ? `/pets/${pet.id}` : "/pets";
  const title = pet ? t("pets.edit") : t("pets.add");

  const problems = petFormProblems(form, values, systemKey);
  const errors = useFormErrors(problems, PET_FIELD_ORDER, "pet");
  const errorFor = (field: PetFieldName) => {
    const problem = errors.problemOf(field);
    return problem && t(`petForm.errors.${problem}`);
  };
  const field = (name: PetFieldName): CheckedField => ({
    id: errors.idOf(name),
    error: errorFor(name),
    onBlur: errors.recheck(name),
  });

  const submit = () => {
    const body = petBodyOf(form, values, petTypeId);
    if (errors.reject() || body === null) {
      return;
    }
    save.mutate(body, {
      onSuccess: (saved) => {
        void navigate(`/pets/${saved.id}`);
        if (saved.targetKcal !== null) {
          showSnackbar(t("target.changed", { kcal: saved.targetKcal }));
        }
      },
    });
  };

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
                addLabel={t("petForm.addPhoto")}
                changeLabel={t("petForm.changePhoto")}
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
                value={petTypeId === null ? "" : String(petTypeId)}
                options={offeredTypes(petTypes ?? [], pet?.petTypeId).map((type) => ({
                  value: String(type.id),
                  label: optionLabel(petTypeLabel(type, t), type, t),
                }))}
                onChange={(value) => set("petTypeId", Number(value))}
              />
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
                suffix={t("common.kg")}
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
              suffix={t("common.kg")}
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
            showOwn={values.ownTarget}
            field={field("ownTarget")}
          />
        </div>
      </div>

      <FormActions
        saveLabel={t("petForm.save")}
        pending={save.isPending}
        onSave={submit}
        cancelTo={closeLink}
      />
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
