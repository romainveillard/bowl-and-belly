import { useTranslation } from "react-i18next";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import type { CheckedField } from "../lib/useFormErrors.js";

export interface StockValues {
  stock: string;
  stockIn: "g" | "kg";
  countIn: "g" | "portion";
}

/** How much of a food is in stock, in grams, kilograms or its portions. */
export function StockCard({
  value,
  onChange,
  units,
  counted,
  editing,
  field,
}: {
  value: StockValues;
  onChange: (patch: Partial<StockValues>) => void;
  /** The portion's plural, such as "Pouches", when the food has portions. */
  units: string | null;
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
      {units && (
        <Segmented
          label={t("foodForm.countIn")}
          value={value.countIn}
          onChange={(countIn) => onChange({ countIn })}
          options={[
            { value: "g", label: t("foodForm.grams") },
            { value: "portion", label: units },
          ]}
        />
      )}
      <div className="flex items-end gap-3">
        <Field
          {...field}
          label={t("foodForm.current")}
          inputMode="decimal"
          suffix={counted && units ? units.toLowerCase() : undefined}
          value={value.stock}
          onChange={(stock) => onChange({ stock })}
        />
        {!counted && (
          <div className="flex-none">
            <Segmented
              label={t("stock.unit")}
              hideLabel
              value={value.stockIn}
              onChange={(stockIn) => onChange({ stockIn })}
              options={[
                { value: "g", label: t("common.g") },
                { value: "kg", label: t("common.kg") },
              ]}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
