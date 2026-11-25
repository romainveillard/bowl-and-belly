import { useState } from "react";
import { List, listRow } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ArchivedLink } from "../components/ArchivedLink.js";
import { FoodTypeBadge, FoodTypeTile } from "./FoodTypeMark.js";
import { FoodTypeChips } from "./FoodTypeChips.js";
import { EmptyState } from "../components/EmptyState.js";
import { PlusIcon, StockIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { FloatingActions } from "../components/ui/layout/FloatingActions.js";
import { PageTitle } from "../components/ui/layout/PageHeader.js";
import { SearchInput } from "../components/ui/forms/Field.js";
import {
  isOutOfStock,
  matchesFood,
  stockLabel,
  useFoods,
  useFoodTypes,
  type FoodSummary,
} from "./foods.js";
import { RestockSheet } from "./RestockSheet.js";

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
    <ArchivedLink
      to="/stock/archived"
      label={t("stock.archivedLink", { count: data.archivedCount })}
      compactOnDesktop
    />
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

  const foods = data.foods.filter((food) => matchesFood(food, search, typeId, i18n.language));
  const kcalPer100 = (food: FoodSummary) =>
    t("stock.per100", {
      kcal: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(
        food.kcalPerKg / 10,
      ),
    });
  return (
    <div className="flex flex-col desktop:gap-6">
      <header className="flex flex-col gap-3 px-5 pt-5 pb-2 desktop:gap-6 desktop:p-0">
        <PageTitle>{t("nav.stock")}</PageTitle>
        <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center">
          <label htmlFor="stock-search" className="sr-only">
            {t("stock.search")}
          </label>
          <SearchInput
            id="stock-search"
            boxClassName="desktop:max-w-[420px] desktop:min-w-60 desktop:flex-1"
            placeholder={t("stock.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <FoodTypeChips
            wrap
            types={foodTypes.filter(
              (type) => !type.archived || data.foods.some((food) => food.type.id === type.id),
            )}
            selected={typeId}
            onSelect={setTypeId}
          />
        </div>
      </header>

      <div className="flex flex-col gap-2.5 px-5 pt-1 pb-24 desktop:gap-6 desktop:p-0 desktop:pb-24">
        {foods.length > 0 && (
          <>
            <List className="desktop:hidden">
              {foods.map((food) => (
                <div
                  key={food.id}
                  className={`flex min-h-16 items-center gap-3 py-2 pr-2 pl-4 ${listRow}`}
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
            </List>

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

      <FloatingActions>
        <Link to="/stock/new" className={button.floating}>
          <PlusIcon size={20} />
          {t("stock.add")}
        </Link>
      </FloatingActions>

      {restocking && <RestockSheet food={restocking} onClose={() => setRestocking(null)} />}
    </div>
  );
}
