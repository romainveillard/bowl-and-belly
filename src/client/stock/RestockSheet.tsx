import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MinusIcon, PlusIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field, FieldError } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import {
  isOutOfStock,
  portionPlural,
  stockLabel,
  stockLeftLabel,
  useRestock,
  type FoodSummary,
} from "./foods.js";
import { parsePositive } from "../lib/format.js";
import { useFormErrors } from "../lib/useFormErrors.js";

const ORDER = ["amount"] as const;

const stepper =
  "flex size-[52px] flex-none cursor-pointer items-center justify-center rounded-full bg-muted";

export function RestockSheet({ food, onClose }: { food: FoodSummary; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const restock = useRestock(food.id);
  const portionG = food.stockUnit === "portion" ? food.portionG : null;
  const [amount, setAmount] = useState(portionG === null ? "" : "1");
  const [unit, setUnit] = useState<"g" | "kg">("kg");

  const value = parsePositive(amount);
  let addG: number | null = null;
  if (value !== null) {
    addG = Math.round(portionG === null ? value * (unit === "kg" ? 1000 : 1) : value * portionG);
  }
  const units = portionG === null ? "" : portionPlural(food.portionName ?? "", i18n).toLowerCase();
  const errors = useFormErrors(
    new Map(addG !== null && addG >= 1 ? [] : [["amount", "amount"] as const]),
    ORDER,
    "restock",
  );
  const amountError = errors.problemOf("amount") && t("stock.errors.amount");
  const amountId = errors.idOf("amount");
  // Stock that ran below zero counts as an empty shelf, as it does on the server.
  const newTotal = { ...food, stockG: Math.max(food.stockG, 0) + (addG ?? 0) };

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("stock.restock")}
      subtitle={t("stock.sheetSubtitle", { name: food.name, stock: stockLeftLabel(food, i18n) })}
      footer={
        <button
          type="button"
          className={button.sheetPrimary}
          disabled={restock.isPending}
          onClick={() => {
            if (!errors.reject() && addG !== null) {
              restock.mutate(addG, { onSuccess: onClose });
            }
          }}
        >
          {t("stock.addToStock")}
        </button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <ErrorSummary inSheet names={errors.shown.map(() => t("stock.errorNames.amount"))} />
        {portionG === null ? (
          <div className="flex items-end gap-3">
            <Field
              id={amountId}
              label={t("stock.adding")}
              inputMode="decimal"
              value={amount}
              onChange={setAmount}
              onBlur={errors.recheck("amount")}
              error={amountError}
            />
            <div className="w-[130px] flex-none">
              <Segmented
                label={t("stock.unit")}
                hideLabel
                value={unit}
                onChange={setUnit}
                options={[
                  { value: "g", label: "g" },
                  { value: "kg", label: "kg" },
                ]}
              />
            </div>
          </div>
        ) : (
          <>
            <label htmlFor={amountId} className="text-sm font-semibold">
              {t("stock.adding")}
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={t("stock.fewer", { unit: units })}
                className={stepper}
                onClick={() => setAmount(String(Math.max(Math.floor(value ?? 1) - 1, 1)))}
              >
                <MinusIcon />
              </button>
              <div className="flex flex-1 flex-col items-center gap-0.5">
                <input
                  id={amountId}
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={errors.recheck("amount")}
                  aria-invalid={amountError ? true : undefined}
                  aria-describedby={amountError ? `${amountId}-error` : undefined}
                  className="w-full bg-transparent text-center font-display text-[44px] leading-[48px] font-semibold tabular-nums focus:outline-none"
                />
                <span className="text-sm text-muted-foreground">{units}</span>
              </div>
              <button
                type="button"
                aria-label={t("stock.more", { unit: units })}
                className={stepper}
                onClick={() => setAmount(String(Math.floor(value ?? 0) + 1))}
              >
                <PlusIcon />
              </button>
            </div>
            {amountError && <FieldError id={`${amountId}-error`}>{amountError}</FieldError>}
          </>
        )}
        <div className="flex justify-between rounded-[10px] bg-muted px-3.5 py-3 text-sm tabular-nums">
          <span className="text-muted-foreground">{t("stock.newTotal")}</span>
          <span className={`font-semibold ${isOutOfStock(newTotal) ? "text-warning" : ""}`}>
            {stockLabel(newTotal, i18n)}
          </span>
        </div>
      </div>
    </Sheet>
  );
}
