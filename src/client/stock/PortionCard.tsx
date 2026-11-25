import { useTranslation } from "react-i18next";
import { Chip } from "../components/ui/forms/Chip.js";
import { Field, FieldError, Input } from "../components/ui/forms/Field.js";
import { Switch } from "../components/ui/forms/Switch.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import type { CheckedField } from "../lib/useFormErrors.js";
import type { PortionValues } from "./foodForm.js";
import { SUGGESTED_PORTIONS } from "./foods.js";

/** Whether a food comes in portions, such as pouches, and what one weighs. */
export function PortionCard({
  value,
  onChange,
  nameField,
  weightField,
}: {
  value: PortionValues;
  onChange: (patch: Partial<PortionValues>) => void;
  nameField: CheckedField;
  weightField: CheckedField;
}) {
  const { t } = useTranslation();
  const nameErrorId = `${nameField.id}-error`;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <CardHeading title={t("foodForm.portion")} hint={t("foodForm.portionHint")} />
        </div>
        <Switch
          label={t("foodForm.usePortion")}
          checked={value.usePortion}
          onCheckedChange={(usePortion) => onChange({ usePortion })}
        />
      </div>
      {value.usePortion && (
        <>
          <div className="flex flex-col gap-2">
            <span id="food-portion-label" className="text-sm font-semibold">
              {t("foodForm.portionName")}
            </span>
            <div role="group" aria-labelledby="food-portion-label" className="flex flex-wrap gap-2">
              {([...SUGGESTED_PORTIONS, "other"] as const).map((choice) => (
                <Chip
                  key={choice}
                  pressed={value.portion === choice}
                  onClick={() => onChange({ portion: choice })}
                >
                  {t(`portionName.${choice}`)}
                </Chip>
              ))}
            </div>
            {value.portion === "other" && (
              <>
                <label htmlFor={nameField.id} className="sr-only">
                  {t("foodForm.otherName")}
                </label>
                <Input
                  id={nameField.id}
                  placeholder={t("foodForm.otherPlaceholder")}
                  value={value.otherPortion}
                  onChange={(event) => onChange({ otherPortion: event.target.value })}
                  onBlur={nameField.onBlur}
                  aria-invalid={nameField.error ? true : undefined}
                  aria-describedby={nameField.error ? nameErrorId : undefined}
                />
                {nameField.error && <FieldError id={nameErrorId}>{nameField.error}</FieldError>}
              </>
            )}
          </div>
          <div className="w-[140px]">
            <Field
              {...weightField}
              label={t("foodForm.weight")}
              inputMode="numeric"
              suffix={t("common.g")}
              value={value.portionG}
              onChange={(portionG) => onChange({ portionG })}
            />
          </div>
        </>
      )}
    </Card>
  );
}
