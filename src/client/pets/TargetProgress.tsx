import { useTranslation } from "react-i18next";
import { OfTarget } from "../components/Figures.js";
import { isOverTarget } from "../lib/dayStatus.js";
import { ProgressBar } from "../components/ui/feedback/ProgressBar.js";
import { formatNumber } from "../lib/format.js";

interface TargetProgressProps {
  eatenKcal: number;
  targetKcal: number | null;
  /** White track on desktop, where the selected card is peach. */
  onAccent?: boolean;
}

/** "Today 201 / 260 kcal" with its bar. The bar is left out when there is no target. */
export function TargetProgress({ eatenKcal, targetKcal, onAccent = false }: TargetProgressProps) {
  const { t, i18n } = useTranslation();
  const percent = targetKcal ? Math.round((eatenKcal / targetKcal) * 100) : 0;

  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
        <span>{t("pets.today")}</span>
        <span>
          <span className="font-semibold text-foreground">
            {formatNumber(eatenKcal, i18n.language)}
          </span>{" "}
          {targetKcal === null ? t("common.kcal") : <OfTarget target={targetKcal} />}
        </span>
      </span>
      {targetKcal !== null && (
        <ProgressBar
          percent={percent}
          tone={isOverTarget(eatenKcal, targetKcal) ? "over" : "default"}
          label={t("pets.progress", { percent })}
          className={onAccent ? "h-2 desktop:bg-card" : "h-2"}
        />
      )}
    </span>
  );
}
