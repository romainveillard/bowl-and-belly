import { useTranslation } from "react-i18next";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import type { CheckedField } from "../lib/useFormErrors.js";
import type { StockValues } from "./foodForm.js";

/** How much of a food is in stock, in grams, kilograms or its portions. */
export function StockCard({
  value,
  onChange,
  portionsLabel,
  portionUnit,
  counted,
  editing,
  field,
}: {
  value: StockValues;
  onChange: (patch: Partial<StockValues>) => void;
  /** The portion's plural, such as "Pouches", when the food has portions. */
  portionsLabel: string | null;
  /** The same, after a number: "pouches". */
  portionUnit: string | null;
  /** The stock is counted in portions. */
  counted: boolean;
  editing: boolean;
  field: CheckedField;
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeading
        title={t("foodForm.stock")}
        hint={t(editing ? "foodForm.stockHintEdit" : "foodForm.stockHint")}
      />
      {portionsLabel && (
        <Segmented
          label={t("foodForm.countIn")}
          value={value.countIn}
          onChange={(countIn) => onChange({ countIn })}
          options={[
            { value: "g", label: t("foodForm.grams") },
            { value: "portion", label: portionsLabel },
          ]}
        />
      )}
      <div className="flex items-end gap-3">
        <Field
          {...field}
          label={t("foodForm.current")}
          inputMode="decimal"
          suffix={counted && portionUnit ? portionUnit : undefined}
          value={value.stock}
          onChange={(stock) => onChange({ stock })}
        />
        {!counted && (
          <Segmented
            label={t("stock.unit")}
            hideLabel
            inline
            value={value.stockIn}
            onChange={(stockIn) => onChange({ stockIn })}
            options={[
              { value: "g", label: t("common.g") },
              { value: "kg", label: t("common.kg") },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
