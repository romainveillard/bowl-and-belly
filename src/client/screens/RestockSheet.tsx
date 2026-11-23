import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MinusIcon, PlusIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { Field } from "../components/ui/Field.js";
import { Segmented } from "../components/ui/Segmented.js";
import { Sheet } from "../components/ui/Sheet.js";
import {
  countPortions,
  portionPlural,
  stockLabel,
  useRestock,
  type FoodSummary,
} from "../lib/foods.js";
import { parsePositive } from "../lib/format.js";

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
  // Stock that ran below zero counts as an empty shelf, as it does on the server.
  const newTotal = { ...food, stockG: Math.max(food.stockG, 0) + (addG ?? 0) };

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("stock.restock")}
      subtitle={t("stock.sheetSubtitle", { name: food.name, stock: stockLabel(food, i18n) })}
      footer={
        <button
          type="button"
          className={`${button.primaryLarge} desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:text-[15px]`}
          disabled={addG === null || restock.isPending}
          onClick={() => addG !== null && restock.mutate(addG, { onSuccess: onClose })}
        >
          {t("stock.addToStock")}
        </button>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        {portionG === null ? (
          <div className="flex items-end gap-3">
            <Field
              label={t("stock.adding")}
              inputMode="decimal"
              value={amount}
              onChange={setAmount}
            />
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
        ) : (
          <>
            <label htmlFor="restock-amount" className="text-sm font-semibold">
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
                  id="restock-amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
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
          </>
        )}
        <div className="flex justify-between rounded-[10px] bg-muted px-3.5 py-3 text-sm tabular-nums">
          <span className="text-muted-foreground">{t("stock.newTotal")}</span>
          <span className="font-semibold">
            {portionG === null
              ? stockLabel(newTotal, i18n)
              : countPortions(food.portionName ?? "", Math.floor(newTotal.stockG / portionG), i18n)}
          </span>
        </div>
      </div>
    </Sheet>
  );
}
