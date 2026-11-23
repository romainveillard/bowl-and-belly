import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { ErrorSummary } from "../components/ui/ErrorSummary.js";
import { Field } from "../components/ui/Field.js";
import { Sheet } from "../components/ui/Sheet.js";
import { formatDateInput } from "../lib/feeds.js";
import { formatDay, formatReadingKg, parsePositive } from "../lib/format.js";
import type { PetDetail } from "../lib/pets.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { useSaveWeight, type WeighInPrompt } from "../lib/weights.js";

type Reading = PetDetail["weights"][number];
type FieldName = "weight" | "date";
const ORDER: FieldName[] = ["weight", "date"];

/** A reading this far from the one before is more likely a typo than a change. */
const BIG_CHANGE = 0.2;

interface LogWeightSheetProps {
  pet: Pick<PetDetail, "id" | "name" | "weights" | "today">;
  timeZone: string;
  /** The weigh-in to correct; a new one is logged without it. */
  editing?: Reading | undefined;
  onSaved: (prompt: WeighInPrompt | null) => void;
  onClose: () => void;
}

export function LogWeightSheet({ pet, timeZone, editing, onSaved, onClose }: LogWeightSheetProps) {
  const { t, i18n } = useTranslation();
  const save = useSaveWeight(pet.id, editing?.id);
  const [weight, setWeight] = useState(editing ? String(editing.weightG / 1000) : "");
  const [date, setDate] = useState(
    editing ? formatDateInput(editing.measuredAt, timeZone) : pet.today,
  );

  const kg = parsePositive(weight);
  const weightG = kg === null ? null : Math.round(kg * 1000);
  const others = pet.weights.filter((reading) => reading.id !== editing?.id);
  const last = others[0];
  // The reading just before this one in time, which a typo would jump away from.
  const previous =
    others.find((reading) => formatDateInput(reading.measuredAt, timeZone) <= date) ?? last;
  const bigChange =
    weightG !== null &&
    weightG > 0 &&
    previous !== undefined &&
    Math.abs(weightG - previous.weightG) > previous.weightG * BIG_CHANGE;

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
              date: formatDay(new Date(last.measuredAt), pet.today, i18n.language),
            })
          : pet.name
      }
      footer={
        <>
          <button
            type="button"
            className={`${button.primaryLarge} desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:text-[15px]`}
            disabled={save.isPending}
            onClick={submit}
          >
            {t("logWeight.save")}
          </button>
          <button
            type="button"
            className={`${button.outline} hidden desktop:inline-flex`}
            onClick={onClose}
          >
            {t("action.cancel")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5 pt-2">
        <ErrorSummary
          inSheet
          names={errors.shown.map((problem) => t(`logWeight.errorNames.${problem}`))}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          <Field
            id="weight-weight"
            label={t("logWeight.weight")}
            inputMode="decimal"
            suffix="kg"
            value={weight}
            onChange={setWeight}
            onBlur={errors.recheck("weight")}
            error={errorFor("weight")}
            // The warning outline replaces the field's own, and the note describes it.
            {...(bigChange && !errorFor("weight")
              ? {
                  "aria-describedby": "weight-warning",
                  className:
                    "h-11 w-full rounded-lg border-[1.5px] border-warning bg-card px-3 pr-14 text-base tabular-nums ring-[3px] ring-[#FBEBD2] focus:outline-none",
                }
              : {})}
          />
          <Field
            id="weight-date"
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
        {bigChange && previous && kg !== null && (
          <div
            id="weight-warning"
            role="status"
            className="flex items-start gap-2 rounded-[10px] bg-[#FBEBD2] px-3 py-2.5 text-[13px] leading-[19px] text-[#6E4A0E]"
          >
            <span className="flex-none">
              <AlertIcon size={18} />
            </span>
            <span>
              {t("logWeight.bigChange", {
                previous: formatReadingKg(previous.weightG, i18n.language),
                // As typed, so "45" reads back as 45 kg rather than 45.0.
                weight: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }).format(
                  kg,
                ),
              })}
            </span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
