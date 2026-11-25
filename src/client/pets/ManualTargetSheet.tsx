import { useState } from "react";
import { useTranslation } from "react-i18next";
import { button } from "../components/ui/forms/button.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { parsePositive } from "../lib/format.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { useSetTarget } from "./pets.js";

const ORDER = ["kcal"] as const;

interface ManualTargetSheetProps {
  petId: number;
  petName: string;
  currentKcal: number | null;
  suggestedKcal: number | null;
  onClose: () => void;
}

export function ManualTargetSheet({
  petId,
  petName,
  currentKcal,
  suggestedKcal,
  onClose,
}: ManualTargetSheetProps) {
  const { t } = useTranslation();
  const [kcal, setKcal] = useState(currentKcal === null ? "" : String(currentKcal));
  const setTarget = useSetTarget(petId);
  const value = parsePositive(kcal);
  // 0.3 kcal would round to a target of 0.
  const valid = value !== null && Math.round(value) >= 1;
  const errors = useFormErrors(new Map(valid ? [] : [["kcal", "kcal"] as const]), ORDER, "target");
  const save = (manualTargetKcal: number | null) =>
    setTarget.mutate(manualTargetKcal, { onSuccess: onClose });

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("target.setOwn")}
      subtitle={
        suggestedKcal === null
          ? petName
          : t("target.sheetSubtitle", { name: petName, kcal: suggestedKcal })
      }
      footer={
        <>
          <button
            type="button"
            className={button.sheetPrimary}
            disabled={setTarget.isPending}
            onClick={() => {
              if (!errors.reject() && value !== null) {
                save(Math.round(value));
              }
            }}
          >
            {t("target.save")}
          </button>
          {suggestedKcal !== null && (
            <button
              type="button"
              className={`${button.ghost} w-full desktop:w-auto`}
              disabled={setTarget.isPending}
              onClick={() => save(null)}
            >
              {t("target.useSuggested", { kcal: suggestedKcal })}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorSummary inSheet names={errors.shown.map(() => t("target.errorNames.kcal"))} />
        <Field
          id={errors.idOf("kcal")}
          label={t("target.field")}
          value={kcal}
          onChange={setKcal}
          onBlur={errors.recheck("kcal")}
          error={errors.problemOf("kcal") && t("target.errors.kcal")}
          suffix={t("common.kcal")}
          inputMode="numeric"
          hint={t("target.appliesFromToday")}
        />
      </div>
    </Sheet>
  );
}
