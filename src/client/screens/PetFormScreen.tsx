import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { ACTIVITY_LEVELS, GOALS } from "../../shared/enums.js";
import { ageInMonths, explainTarget } from "../../shared/target.js";
import { BackIcon, CameraIcon, ChevronDownIcon, CloseIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { Card, CardHeading } from "../components/ui/Card.js";
import { Field, inputClass } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Switch } from "../components/ui/Switch.js";
import { parsePositive, petTypeLabel } from "../lib/format.js";
import {
  uploadPhoto,
  usePet,
  usePets,
  usePetTypes,
  useSavePet,
  type PetBody,
  type PetDetail,
} from "../lib/pets.js";

type AgeMode = PetBody["birthDatePrecision"];

interface FormState {
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

const kgText = (weightG: number | null | undefined) => (weightG ? String(weightG / 1000) : "");

function initialState(pet: PetDetail | undefined): FormState {
  const target = pet?.targets[0];
  return {
    name: pet?.name ?? "",
    petTypeId: pet?.petTypeId ?? null,
    photoId: pet?.photoId ?? null,
    ageMode: pet?.birthDatePrecision ?? "exact",
    birthDate: pet?.birthDate ?? "",
    birthYear: pet ? pet.birthDate.slice(0, 4) : "",
    ageYears: pet ? String(Math.floor(ageInMonths(pet.birthDate, pet.today) / 12)) : "",
    neutered: pet?.neutered ?? true,
    activityLevel: pet?.activityLevel ?? "normal",
    goal: pet?.goal ?? "maintain",
    targetWeight: kgText(pet?.targetWeightG),
    weight: kgText(pet?.weights[0]?.weightG),
    ownTarget: target?.source === "manual",
    ownTargetKcal: target?.source === "manual" ? String(target.kcalPerDay) : "",
  };
}

/** The birth date the age section stands for, or null while it is incomplete. */
function birthDateOf(form: FormState, today: string, original: PetDetail | undefined) {
  if (form.ageMode === "exact") {
    return /^\d{4}-\d{2}-\d{2}$/.test(form.birthDate) && form.birthDate <= today
      ? form.birthDate
      : null;
  }
  if (form.ageMode === "year") {
    const year = Number(form.birthYear);
    // Mid-year, so the age is never more than six months out.
    const date = `${form.birthYear}-07-01`;
    return Number.isInteger(year) && year > 1900 && `${year}-01-01` <= today ? date : null;
  }
  const years = parsePositive(form.ageYears);
  if (years === null) {
    return null;
  }
  // An unchanged estimate keeps its date, so the pet still ages between edits.
  if (
    original?.birthDatePrecision === "estimated" &&
    form.ageYears === initialState(original).ageYears
  ) {
    return original.birthDate;
  }
  const born = new Date(`${today}T00:00:00Z`);
  born.setUTCMonth(born.getUTCMonth() - Math.round(years * 12));
  return born.toISOString().slice(0, 10);
}

function PetForm({ pet, today }: { pet: PetDetail | undefined; today: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: petTypes } = usePetTypes();
  const save = useSavePet(pet?.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => initialState(pet));
  const set = <Key extends keyof FormState>(key: Key, value: FormState[Key]) =>
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

  const body: PetBody | null =
    form.name.trim() !== "" &&
    petTypeId !== null &&
    birthDate !== null &&
    (!hasWeightGoal || targetWeightKg !== null) &&
    (form.weight.trim() === "" || weightKg !== null) &&
    (!form.ownTarget || ownKcal !== null)
      ? {
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
        }
      : null;

  const submit = () => {
    if (body) {
      save.mutate(body, { onSuccess: (id) => navigate(`/pets/${id}`) });
    }
  };

  const saveButton = (className: string) => (
    <button type="button" className={className} disabled={!body || save.isPending} onClick={submit}>
      {t("petForm.save")}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col desktop:min-h-0 desktop:gap-6">
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to={closeLink} aria-label={t("action.close")} className={button.icon}>
          <CloseIcon />
        </Link>
        <h1 className="font-display text-title font-semibold">{title}</h1>
      </header>
      <header className="hidden flex-col gap-1 desktop:flex">
        <Link to="/pets" className="inline-flex items-center gap-1 text-sm font-semibold">
          <BackIcon size={16} />
          {t("nav.pets")}
        </Link>
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {title}
        </h1>
      </header>

      <div className="grid flex-1 content-start gap-3.5 px-5 pt-1 pb-4 desktop:grid-cols-2 desktop:items-start desktop:gap-6 desktop:p-0">
        <div className="flex min-w-0 flex-col gap-3.5 desktop:gap-6">
          <Card>
            <CardHeading title={t("petForm.details")} />
            <div className="flex items-center gap-3.5 desktop:gap-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex size-[88px] flex-none cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-full border-[1.5px] border-dashed border-[#B9BFCB] bg-background text-[13px] font-medium text-muted-foreground desktop:size-24"
              >
                {form.photoId === null ? (
                  <>
                    <CameraIcon />
                    {t("petForm.photo")}
                  </>
                ) : (
                  <img
                    src={`/api/images/${form.photoId}`}
                    alt={t("petForm.photo")}
                    className="size-full object-cover"
                  />
                )}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const photo = event.target.files?.[0];
                  if (photo) {
                    void uploadPhoto(photo).then((id) => set("photoId", id));
                  }
                }}
              />
              <span className="text-[13px] text-muted-foreground">{t("petForm.photoHint")}</span>
            </div>
            <div className="flex flex-col gap-3.5 desktop:grid desktop:grid-cols-2 desktop:gap-4">
              <Field
                label={t("petForm.name")}
                value={form.name}
                onChange={(name) => set("name", name)}
              />
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("petForm.type")}
                <span className="relative font-normal">
                  <select
                    value={petTypeId ?? ""}
                    onChange={(event) => set("petTypeId", Number(event.target.value))}
                    className={`${inputClass} appearance-none pr-11`}
                  >
                    {petTypes?.map((type) => (
                      <option key={type.id} value={type.id}>
                        {petTypeLabel(type, t)}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3 right-3.5 text-muted-foreground"
                  >
                    <ChevronDownIcon size={20} />
                  </span>
                </span>
              </label>
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
                label={t("petForm.birthDate")}
                type="date"
                max={today}
                value={form.birthDate}
                onChange={(value) => set("birthDate", value)}
              />
            )}
            {form.ageMode === "year" && (
              <Field
                label={t("petForm.birthYear")}
                inputMode="numeric"
                value={form.birthYear}
                onChange={(value) => set("birthYear", value)}
              />
            )}
            {form.ageMode === "estimated" && (
              <Field
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
              label={t("weight.current")}
              inputMode="decimal"
              suffix={t("weight.kg")}
              value={form.weight}
              onChange={(value) => set("weight", value)}
            />
          </Card>

          <Card>
            <CardHeading title={t("target.title")} />
            {systemKey !== null &&
              (suggestion ? (
                <>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-figure font-semibold tabular-nums desktop:text-[32px]">
                      {suggestion.kcalPerDay}
                    </span>
                    <span className="text-[15px] text-muted-foreground">
                      {t("target.perDaySuggested")}
                    </span>
                  </span>
                  {suggestion.basis !== "growth" && hasWeightGoal && (
                    <span className="text-[13px] text-muted-foreground">
                      {t(
                        form.goal === "lose"
                          ? "target.basedOnTargetLose"
                          : "target.basedOnTargetGain",
                      )}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[13px] text-muted-foreground">{t("target.needsWeight")}</span>
              ))}
            {systemKey !== null && (
              <div className="flex items-center justify-between gap-3">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{t("target.setOwn")}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {t("target.setOwnHint")}
                  </span>
                </span>
                <Switch
                  label={t("target.setOwn")}
                  checked={form.ownTarget}
                  onCheckedChange={(checked) => set("ownTarget", checked)}
                />
              </div>
            )}
            {ownTarget && (
              <Field
                label={t("target.field")}
                inputMode="numeric"
                suffix="kcal"
                value={form.ownTargetKcal}
                onChange={(value) => set("ownTargetKcal", value)}
              />
            )}
          </Card>
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
