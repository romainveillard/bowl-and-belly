import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PickerFood } from "../lib/feeds.js";
import { foodTypeLabel, isOutOfStock, stockLeftLabel } from "../lib/foods.js";
import { FoodTypeBadge, FoodTypeTile } from "./FoodTypeMark.js";
import { SearchIcon } from "./icons.js";
import { inputClass } from "./ui/forms/Field.js";

const chip =
  "h-9 flex-none cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-medium aria-pressed:border-primary-strong aria-pressed:bg-accent-soft aria-pressed:font-semibold";

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
  const wanted = search.trim().toLocaleLowerCase(i18n.language);
  const shown = foods.filter(
    (food) =>
      (typeId === null || food.type.id === typeId) &&
      `${food.name} ${food.brand ?? ""}`.toLocaleLowerCase(i18n.language).includes(wanted),
  );
  const showRecentLabel = recentCount > 0 && wanted === "" && typeId === null;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor={inputId} className="text-sm font-semibold desktop:sr-only">
        {t("logFeed.food")}
      </label>
      <div className="flex flex-col gap-2.5 desktop:flex-row desktop:items-center">
        <div className="relative desktop:flex-1">
          <span aria-hidden="true" className="absolute top-3 left-3 text-muted-foreground">
            <SearchIcon size={20} />
          </span>
          <input
            id={inputId}
            type="search"
            placeholder={t("logFeed.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${inputClass} pl-10`}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={typeId === null}
            className={chip}
            onClick={() => setTypeId(null)}
          >
            {t("stock.all")}
          </button>
          {types.map((type) => (
            <button
              key={type.id}
              type="button"
              aria-pressed={typeId === type.id}
              className={chip}
              onClick={() => setTypeId(type.id)}
            >
              {foodTypeLabel(type, t)}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <span id={errorId} className="text-[13px] font-medium text-danger">
          {error}
        </span>
      )}
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
              className="flex min-h-[60px] w-full cursor-pointer items-center gap-3 border-t border-border px-3 py-2 text-left first:border-t-0 aria-pressed:bg-accent-soft aria-pressed:inset-ring-2 aria-pressed:inset-ring-primary-strong desktop:min-h-14"
            >
              <FoodImage food={food} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-semibold">{food.name}</span>
                {food.brand && (
                  <span className="truncate text-[13px] text-muted-foreground">{food.brand}</span>
                )}
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <FoodTypeBadge type={food.type} />
                <span
                  className={`text-[13px] tabular-nums ${isOutOfStock(food) ? "font-semibold text-warning" : "text-muted-foreground"}`}
                >
                  {stockLeftLabel(food, i18n)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The food's photo, or its type tile when it has none. */
export function FoodImage({
  food,
}: {
  food: { photoId: number | null; type: { systemKey: "wet" | "dry" | null; name: string | null } };
}) {
  return food.photoId === null ? (
    <FoodTypeTile type={food.type} />
  ) : (
    <img
      src={`/api/images/${food.photoId}`}
      alt=""
      className="size-10 flex-none rounded-[10px] object-cover"
    />
  );
}
