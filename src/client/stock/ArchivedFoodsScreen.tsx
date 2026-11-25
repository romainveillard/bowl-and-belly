import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ArchivedList } from "../components/ArchivedList.js";
import { FoodTypeTile } from "./FoodTypeMark.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { foodTypeLabel, useArchivedFoods, useSetFoodArchived } from "./foods.js";
import { formatInstantDay } from "../lib/format.js";
import { useSettings } from "../settings/settings.js";
import { usePets } from "../pets/pets.js";

export function ArchivedFoodsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: archived } = useArchivedFoods();
  // Only for the app day, which decides whether dates need their year.
  const { data: pets } = usePets();
  const { data: settings } = useSettings();
  const restore = useSetFoodArchived("restore");

  if (!archived || !pets || !settings) {
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

      <ArchivedList
        hint={t("stock.archivedHint")}
        items={archived.map((food) => ({
          id: food.id,
          name: food.name,
          leading: <FoodTypeTile type={food.type} />,
          detail: t("stock.archivedRow", {
            type: foodTypeLabel(food.type, t),
            date: food.archivedAt
              ? formatInstantDay(food.archivedAt, settings, pets.today, i18n.language)
              : "",
          }),
        }))}
        restoring={restore.isPending}
        onRestore={(id) =>
          restore.mutate(id, {
            onSuccess: () => {
              if (archived.length === 1) {
                void navigate("/stock");
              }
            },
          })
        }
      />
    </div>
  );
}
