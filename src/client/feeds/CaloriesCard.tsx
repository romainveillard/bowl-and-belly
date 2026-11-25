import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/layout/Card.js";
import { foodTypeLabel } from "../stock/foods.js";
import type { DaySummary } from "./feeds.js";

/** Today's calories against the target, with the split by food type. */
export function CaloriesCard({
  eatenKcal,
  targetKcal,
  byType,
}: {
  eatenKcal: number;
  targetKcal: number | null;
  byType: DaySummary["byType"];
}) {
  const { t } = useTranslation();
  const percent = targetKcal ? Math.round((eatenKcal / targetKcal) * 100) : 0;
  const over = targetKcal !== null && eatenKcal > targetKcal;

  return (
    <Card label={t("today.caloriesLabel")}>
      <h2 className="hidden text-base font-semibold desktop:block">{t("today.caloriesToday")}</h2>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="font-display text-4xl leading-10 font-semibold desktop:text-[44px] desktop:leading-[48px]">
          {eatenKcal}
        </span>
        <span className="text-base text-muted-foreground desktop:text-heading">
          {targetKcal === null ? t("pets.kcal") : t("pets.ofTarget", { target: targetKcal })}
        </span>
      </span>
      {targetKcal !== null && (
        <span
          role="img"
          aria-label={t("pets.progress", { percent })}
          className="relative block h-2.5 rounded-full bg-muted desktop:h-3"
        >
          <span
            className={`absolute inset-y-0 left-0 rounded-full ${over ? "bg-primary-strong" : "bg-primary"}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </span>
      )}
      {byType.length === 0 ? (
        <span className="text-[13px] text-muted-foreground desktop:text-sm">
          {t("today.noFeeds")}
        </span>
      ) : (
        <span className="flex justify-between gap-3 text-[13px] text-muted-foreground tabular-nums desktop:text-sm">
          <span className={over ? "font-semibold text-warning" : ""}>
            {targetKcal !== null &&
              (over
                ? t("feed.kcalOver", { kcal: eatenKcal - targetKcal })
                : t("feed.kcalLeft", { kcal: targetKcal - eatenKcal }))}
          </span>
          <span>
            {byType
              .map((total) =>
                t("feed.split", { type: foodTypeLabel(total.type, t), kcal: total.kcal }),
              )
              .join(" · ")}
          </span>
        </span>
      )}
    </Card>
  );
}
