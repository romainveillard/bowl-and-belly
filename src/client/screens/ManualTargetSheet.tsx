import { useState } from "react";
import { useTranslation } from "react-i18next";
import { button } from "../components/ui/forms/button.js";
import { Field } from "../components/ui/forms/Field.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { parsePositive } from "../lib/format.js";
import { useSetTarget } from "../lib/pets.js";

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
            disabled={value === null || setTarget.isPending}
            onClick={() => value !== null && save(Math.round(value))}
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
      <Field
        label={t("target.field")}
        value={kcal}
        onChange={setKcal}
        suffix="kcal"
        inputMode="numeric"
        hint={t("target.appliesFromToday")}
      />
    </Sheet>
  );
}
