import { useTranslation } from "react-i18next";
import type { TargetExplanation } from "../../shared/target.js";
import { Field } from "../components/ui/forms/Field.js";
import { SwitchRow } from "../components/ui/forms/SwitchRow.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import type { CheckedField } from "../lib/useFormErrors.js";
import type { PetFormState } from "./petForm.js";

type TargetValues = Pick<PetFormState, "ownTarget" | "ownTargetKcal">;

/**
 * The pet form's daily target: the formula's suggestion, or the user's own.
 * A custom pet type has no formula, so it only ever shows the own-target field.
 */
export function PetTargetCard({
  hasFormula,
  suggestion,
  goal,
  value,
  onChange,
  showOwn,
  field,
}: {
  hasFormula: boolean;
  suggestion: TargetExplanation | null;
  goal: PetFormState["goal"];
  value: TargetValues;
  onChange: (patch: Partial<TargetValues>) => void;
  showOwn: boolean;
  field: CheckedField;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeading title={t("target.title")} />
      {hasFormula &&
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
            {suggestion.basis !== "growth" && goal !== "maintain" && (
              <span className="text-[13px] text-muted-foreground">
                {t(goal === "lose" ? "target.basedOnTargetLose" : "target.basedOnTargetGain")}
              </span>
            )}
          </>
        ) : (
          <span className="text-[13px] text-muted-foreground">{t("target.needsWeight")}</span>
        ))}
      {hasFormula && (
        <SwitchRow
          label={t("target.setOwn")}
          hint={t("target.setOwnHint")}
          checked={value.ownTarget}
          onCheckedChange={(ownTarget) => onChange({ ownTarget })}
        />
      )}
      {showOwn && (
        <Field
          {...field}
          label={t("target.field")}
          inputMode="numeric"
          suffix="kcal"
          value={value.ownTargetKcal}
          onChange={(ownTargetKcal) => onChange({ ownTargetKcal })}
        />
      )}
    </Card>
  );
}
