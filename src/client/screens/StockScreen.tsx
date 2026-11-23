import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { FoodTypeBadge, FoodTypeTile } from "../components/FoodTypeMark.js";
import { EmptyState } from "../components/EmptyState.js";
import { ChevronRightIcon, PlusIcon, SearchIcon, StockIcon } from "../components/icons.js";
import { button } from "../components/ui/button.js";
import { inputClass } from "../components/ui/Field.js";
import {
  foodTypeLabel,
  isOutOfStock,
  stockLabel,
  useFoods,
  useFoodTypes,
  type FoodSummary,
} from "../lib/foods.js";
import { RestockSheet } from "./RestockSheet.js";

const chip =
  "h-9 cursor-pointer rounded-full border border-border bg-card px-3.5 text-sm font-medium aria-pressed:border-primary-strong aria-pressed:bg-accent-soft aria-pressed:font-semibold";
const columns = "grid grid-cols-[minmax(0,2.4fr)_90px_140px_150px_132px] gap-4 px-[22px]";
const columnHeader = "text-caption font-medium tracking-[0.6px] text-muted-foreground uppercase";

function FoodName({ food }: { food: FoodSummary }) {
  return (
    <Link
      to={`/stock/${food.id}/edit`}
      className="flex min-w-0 flex-1 flex-col gap-[3px] desktop:gap-0.5"
    >
      <span className="truncate text-[15px] font-semibold">{food.name}</span>
      {food.brand && (
        <span className="truncate text-[13px] text-muted-foreground">{food.brand}</span>
      )}
    </Link>
  );
}

export function StockScreen() {
  const { t, i18n } = useTranslation();
  const { data } = useFoods();
  const { data: foodTypes } = useFoodTypes();
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [restocking, setRestocking] = useState<FoodSummary | null>(null);

  if (!data || !foodTypes) {
    return null;
  }
  const archivedLink = data.archivedCount > 0 && (
    <Link
      to="/stock/archived"
      className="flex min-h-11 items-center justify-between px-1 text-sm text-muted-foreground desktop:inline-flex desktop:justify-start desktop:gap-1.5 desktop:self-start desktop:px-0"
    >
      {t("stock.archivedLink", { count: data.archivedCount })}
      <ChevronRightIcon size={18} />
    </Link>
  );

  if (data.foods.length === 0) {
    return (
      <EmptyState
        heading={t("nav.stock")}
        icon={<StockIcon size={30} />}
        title={t("stock.emptyTitle")}
        body={t("stock.emptyBody")}
        action={{ to: "/stock/new", label: t("stock.addFirst") }}
        footer={archivedLink}
      />
    );
  }

  const wanted = search.trim().toLocaleLowerCase(i18n.language);
  const foods = data.foods.filter(
    (food) =>
      (typeId === null || food.type.id === typeId) &&
      `${food.name} ${food.brand ?? ""}`.toLocaleLowerCase(i18n.language).includes(wanted),
  );
  const kcalPer100 = (food: FoodSummary) =>
    t("stock.per100", {
      kcal: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(
        food.kcalPerKg / 10,
      ),
    });
  return (
    <div className="flex flex-col desktop:gap-6">
      <header className="flex flex-col gap-3 px-5 pt-5 pb-2 desktop:gap-6 desktop:p-0">
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {t("nav.stock")}
        </h1>
        <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center">
          <div className="relative desktop:max-w-[420px] desktop:min-w-60 desktop:flex-1">
            <label htmlFor="stock-search" className="sr-only">
              {t("stock.search")}
            </label>
            <span aria-hidden="true" className="absolute top-3 left-3 text-muted-foreground">
              <SearchIcon size={20} />
            </span>
            <input
              id="stock-search"
              type="search"
              placeholder={t("stock.search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={typeId === null}
              className={chip}
              onClick={() => setTypeId(null)}
            >
              {t("stock.all")}
            </button>
            {foodTypes.map((type) => (
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
      </header>

      <div className="flex flex-col gap-2.5 px-5 pt-1 pb-24 desktop:gap-6 desktop:p-0 desktop:pb-24">
        {foods.length > 0 && (
          <>
            <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:hidden">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className="flex min-h-16 items-center gap-3 border-t border-border py-2 pr-2 pl-4 first:border-t-0"
                >
                  <FoodTypeTile type={food.type} />
                  <FoodName food={food} />
                  <span
                    className={`flex-none text-sm font-semibold tabular-nums ${isOutOfStock(food) ? "text-warning" : ""}`}
                  >
                    {stockLabel(food, i18n)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("stock.restockNamed", { name: food.name })}
                    className={button.icon}
                    onClick={() => setRestocking(food)}
                  >
                    <PlusIcon />
                  </button>
                </div>
              ))}
            </div>

            <div
              role="table"
              className="hidden overflow-x-auto rounded-[14px] bg-card inset-ring inset-ring-border desktop:block"
            >
              <div className="min-w-[760px]">
                <div role="row" className={`${columns} py-3.5`}>
                  <span role="columnheader" className={columnHeader}>
                    {t("stock.colFood")}
                  </span>
                  <span role="columnheader" className={columnHeader}>
                    {t("stock.colType")}
                  </span>
                  <span role="columnheader" className={columnHeader}>
                    {t("stock.colLeft")}
                  </span>
                  <span role="columnheader" className={columnHeader}>
                    {t("stock.colCalories")}
                  </span>
                  <span role="columnheader" className="sr-only">
                    {t("stock.colActions")}
                  </span>
                </div>
                {foods.map((food) => (
                  <div
                    key={food.id}
                    role="row"
                    className={`${columns} min-h-16 items-center border-t border-border py-2`}
                  >
                    <span role="cell" className="flex min-w-0 items-center gap-3">
                      <FoodTypeTile type={food.type} />
                      <FoodName food={food} />
                    </span>
                    <span role="cell">
                      <FoodTypeBadge type={food.type} />
                    </span>
                    <span
                      role="cell"
                      className={`text-[15px] font-semibold tabular-nums ${isOutOfStock(food) ? "text-warning" : ""}`}
                    >
                      {stockLabel(food, i18n)}
                    </span>
                    <span role="cell" className="text-sm text-muted-foreground tabular-nums">
                      {kcalPer100(food)}
                    </span>
                    <span role="cell" className="flex justify-end">
                      <button
                        type="button"
                        aria-label={t("stock.restockNamed", { name: food.name })}
                        className={`${button.outline} h-9 px-3 text-sm`}
                        onClick={() => setRestocking(food)}
                      >
                        <PlusIcon size={16} />
                        {t("stock.restock")}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {archivedLink}
      </div>

      <Link
        to="/stock/new"
        className={`${button.floating} fixed right-5 bottom-[calc(86px+env(safe-area-inset-bottom))] desktop:right-8 desktop:bottom-8`}
      >
        <PlusIcon size={20} />
        {t("stock.add")}
      </Link>

      {restocking && <RestockSheet food={restocking} onClose={() => setRestocking(null)} />}
    </div>
  );
}
