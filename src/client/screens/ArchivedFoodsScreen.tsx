import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { FoodTypeTile } from "../components/FoodTypeMark.js";
import { button } from "../components/ui/forms/button.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { foodTypeLabel, useArchivedFoods, useSetFoodArchived } from "../lib/foods.js";
import { formatDay } from "../lib/format.js";
import { usePets } from "../lib/pets.js";

export function ArchivedFoodsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: archived } = useArchivedFoods();
  // Only for the app day, which decides whether dates need their year.
  const { data: pets } = usePets();
  const restore = useSetFoodArchived("restore");

  if (!archived || !pets) {
    return null;
  }

  return (
    <div className="flex flex-col desktop:gap-6">
      <SubPageHeader
        title={t("stock.archivedTitle")}
        hint={t("stock.archivedHint")}
        phoneLink={{ to: "/stock", label: t("nav.stock") }}
        desktopLink={{ to: "/stock", label: t("nav.stock") }}
      />

      <div className="flex flex-col gap-3 px-5 pt-1 desktop:p-0">
        <p className="text-sm text-muted-foreground desktop:hidden">{t("stock.archivedHint")}</p>
        <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:max-w-[720px] desktop:rounded-[14px]">
          {archived.map((food) => (
            <div
              key={food.id}
              className="flex min-h-[68px] items-center gap-3 border-t border-border py-2.5 pr-3 pl-4 first:border-t-0 desktop:min-h-[72px] desktop:gap-3.5 desktop:px-[22px] desktop:py-3"
            >
              <FoodTypeTile type={food.type} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-semibold">{food.name}</span>
                <span className="text-[13px] text-muted-foreground">
                  {t("stock.archivedRow", {
                    type: foodTypeLabel(food.type, t),
                    date: food.archivedAt
                      ? formatDay(new Date(food.archivedAt), pets.today, i18n.language)
                      : "",
                  })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t("pets.restoreNamed", { name: food.name })}
                className={`${button.outline} flex-none`}
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(food.id, {
                    onSuccess: () => archived.length === 1 && navigate("/stock"),
                  })
                }
              >
                {t("pets.restore")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
