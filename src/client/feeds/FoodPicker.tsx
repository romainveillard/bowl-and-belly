import { useState } from "react";
import { listRow } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import type { PickerFood } from "./feeds.js";
import { isOutOfStock, matchesFood, stockLeftLabel } from "../stock/foods.js";
import { FoodTypeBadge } from "../stock/FoodTypeMark.js";
import { FoodRow } from "../stock/FoodRow.js";
import { FoodTypeChips } from "../stock/FoodTypeChips.js";
import { FieldError, SearchInput } from "../components/ui/forms/Field.js";

interface FoodPickerProps {
  /** The search field's id, which a form error focuses. */
  inputId: string;
  foods: PickerFood[];
  /** How many of `foods`, from the start, are recently fed. */
  recentCount: number;
  chosenId: number | null;
  onChoose: (food: PickerFood) => void;
  error?: string | undefined;
}

/** Search, type chips and the list of foods, recent ones first. */
export function FoodPicker({
  inputId,
  foods,
  recentCount,
  chosenId,
  onChoose,
  error,
}: FoodPickerProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);

  const types = [...new Map(foods.map((food) => [food.type.id, food.type])).values()];
  const shown = foods.filter((food) => matchesFood(food, search, typeId, i18n.language));
  const showRecentLabel = recentCount > 0 && search.trim() === "" && typeId === null;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={inputId} className="text-sm font-semibold desktop:sr-only">
        {t("logFeed.food")}
      </label>
      <div className="flex flex-col gap-2.5 desktop:flex-row desktop:items-center">
        <SearchInput
          id={inputId}
          boxClassName="desktop:flex-1"
          placeholder={t("logFeed.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <FoodTypeChips types={types} selected={typeId} onSelect={setTypeId} />
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {showRecentLabel && (
        <span className="mt-1 text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase desktop:hidden">
          {t("logFeed.recent")}
        </span>
      )}
      {shown.length > 0 && (
        <div className="overflow-hidden rounded-xl inset-ring inset-ring-border">
          {shown.map((food) => (
            <button
              key={food.id}
              type="button"
              aria-pressed={food.id === chosenId}
              onClick={() => onChoose(food)}
              className={`flex min-h-[60px] w-full cursor-pointer items-center gap-3 px-3 py-2 text-left aria-pressed:bg-accent-soft aria-pressed:inset-ring-2 aria-pressed:inset-ring-primary-strong desktop:min-h-14 ${listRow}`}
            >
              <FoodRow
                food={food}
                trailing={
                  <span className="flex flex-none flex-col items-end gap-1">
                    <FoodTypeBadge type={food.type} />
                    <span
                      className={`text-[13px] tabular-nums ${isOutOfStock(food) ? "font-semibold text-warning" : "text-muted-foreground"}`}
                    >
                      {stockLeftLabel(food, i18n)}
                    </span>
                  </span>
                }
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
