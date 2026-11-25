import { useTranslation } from "react-i18next";
import { OfTarget } from "../components/Figures.js";
import { ProgressBar } from "../components/ui/feedback/ProgressBar.js";
import { Card } from "../components/ui/layout/Card.js";
import { isOverTarget } from "../lib/dayStatus.js";
import { foodTypeLabel } from "../stock/foods.js";
import type { DaySummary } from "./feeds.js";
import { formatNumber } from "../lib/format.js";

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
  const { t, i18n } = useTranslation();
  const percent = targetKcal ? Math.round((eatenKcal / targetKcal) * 100) : 0;
  const over = targetKcal !== null && eatenKcal > targetKcal;
  // Warn only past the on-target band, like the bar and History.
  const overBand = isOverTarget(eatenKcal, targetKcal);

  return (
    <Card label={t("today.caloriesLabel")}>
      <h2 className="hidden text-base font-semibold desktop:block">{t("today.caloriesToday")}</h2>
      <span className="flex items-baseline gap-2 tabular-nums">
        <span className="font-display text-4xl leading-10 font-semibold desktop:text-[44px] desktop:leading-[48px]">
          {formatNumber(eatenKcal, i18n.language)}
        </span>
        <span className="text-base text-muted-foreground desktop:text-heading">
          {targetKcal === null ? t("common.kcal") : <OfTarget target={targetKcal} />}
        </span>
      </span>
      {targetKcal !== null && (
        <ProgressBar
          percent={percent}
          tone={overBand ? "over" : "default"}
          label={t("pets.progress", { percent })}
          className="h-2.5 desktop:h-3"
        />
      )}
      {byType.length === 0 ? (
        <span className="text-[13px] text-muted-foreground desktop:text-sm">
          {t("today.noFeeds")}
        </span>
      ) : (
        <span className="flex justify-between gap-3 text-[13px] text-muted-foreground tabular-nums desktop:text-sm">
          <span className={overBand ? "font-semibold text-warning" : ""}>
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
