import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Notice } from "../components/ui/feedback/Notice.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { SheetActions } from "../components/ui/overlays/SheetActions.js";
import { appDayOf, type DaySettings } from "../../shared/app-day.js";
import {
  formatInputNumber,
  formatInstantDay,
  formatReadingKg,
  parsePositive,
} from "../lib/format.js";
import type { PetDetail } from "./pets.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { bigChangeFrom, useSaveWeight, type WeighInPrompt } from "./weights.js";

type Reading = PetDetail["weights"][number];
type FieldName = "weight" | "date";
const ORDER: FieldName[] = ["weight", "date"];

interface LogWeightSheetProps {
  pet: Pick<PetDetail, "id" | "name" | "weights" | "today">;
  daySettings: DaySettings;
  /** The weigh-in to correct; a new one is logged without it. */
  editing?: Reading | undefined;
  onSaved: (prompt: WeighInPrompt | null) => void;
  onClose: () => void;
}

export function LogWeightSheet({
  pet,
  daySettings,
  editing,
  onSaved,
  onClose,
}: LogWeightSheetProps) {
  const { t, i18n } = useTranslation();
  const save = useSaveWeight(pet.id, editing?.id);
  const dayOf = (reading: Reading) => appDayOf(new Date(reading.measuredAt), daySettings);
  const [weight, setWeight] = useState(
    editing ? formatInputNumber(editing.weightG / 1000, i18n.language, 3) : "",
  );
  const [date, setDate] = useState(editing ? dayOf(editing) : pet.today);

  const kg = parsePositive(weight);
  const weightG = kg === null ? null : Math.round(kg * 1000);
  const others = pet.weights.filter((reading) => reading.id !== editing?.id);
  const last = others[0];
  const changedFrom = bigChangeFrom(weightG, date, others, dayOf);
  const bigChange = changedFrom !== undefined;

  const problems = new Map<FieldName, FieldName>();
  if (weightG === null || weightG === 0) {
    problems.set("weight", "weight");
  }
  if (date === "" || date > pet.today) {
    problems.set("date", "date");
  }
  const errors = useFormErrors(problems, ORDER, "weight");
  const errorFor = (field: FieldName) => errors.problemOf(field) && t(`logWeight.errors.${field}`);

  const submit = () => {
    if (errors.reject() || weightG === null) {
      return;
    }
    save.mutate({ weightG, date }, { onSuccess: onSaved });
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t(editing ? "logWeight.editTitle" : "logWeight.title")}
      subtitle={
        last
          ? t("logWeight.subtitle", {
              name: pet.name,
              weight: formatReadingKg(last.weightG, i18n.language),
              date: formatInstantDay(last.measuredAt, daySettings, pet.today, i18n.language),
            })
          : pet.name
      }
      footer={
        <SheetActions
          saveLabel={t("logWeight.save")}
          pending={save.isPending}
          onSave={submit}
          onCancel={onClose}
        />
      }
    >
      <div className="flex flex-col gap-3.5 pt-2">
        <ErrorSummary
          inSheet
          names={errors.shown.map((problem) => t(`logWeight.errorNames.${problem}`))}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <Field
            id={errors.idOf("weight")}
            label={t("logWeight.weight")}
            inputMode="decimal"
            suffix={t("common.kg")}
            value={weight}
            onChange={setWeight}
            onBlur={errors.recheck("weight")}
            error={errorFor("weight")}
            // The note under the fields says why the weight is outlined.
            {...(bigChange && !errorFor("weight")
              ? { "aria-describedby": "weight-warning", tone: "warning" as const }
              : {})}
          />
          <Field
            id={errors.idOf("date")}
            label={t("logWeight.date")}
            type="date"
            max={pet.today}
            value={date}
            onChange={setDate}
            onBlur={errors.recheck("date")}
            error={errorFor("date")}
            hint={date === pet.today ? t("logWeight.today") : undefined}
          />
        </div>
        {changedFrom && kg !== null && (
          <Notice tone="warning" role="status" id="weight-warning">
            {t("logWeight.bigChange", {
              previous: formatReadingKg(changedFrom.weightG, i18n.language),
              // As typed, so "45" reads back as 45 kg rather than 45.0.
              weight: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }).format(kg),
            })}
          </Notice>
        )}
      </div>
    </Sheet>
  );
}
