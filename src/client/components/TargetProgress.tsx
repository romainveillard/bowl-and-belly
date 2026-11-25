import { useTranslation } from "react-i18next";

interface TargetProgressProps {
  eatenKcal: number;
  targetKcal: number | null;
  /** White track on desktop, where the selected card is peach. */
  onAccent?: boolean;
}

/** "Today 201 / 260 kcal" with its bar. The bar is left out when there is no target. */
export function TargetProgress({ eatenKcal, targetKcal, onAccent = false }: TargetProgressProps) {
  const { t } = useTranslation();
  const percent = targetKcal ? Math.round((eatenKcal / targetKcal) * 100) : 0;

  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[13px] text-muted-foreground tabular-nums">
        <span>{t("pets.today")}</span>
        <span>
          <span className="font-semibold text-foreground">{eatenKcal}</span>{" "}
          {targetKcal === null ? t("common.kcal") : t("common.ofTarget", { target: targetKcal })}
        </span>
      </span>
      {targetKcal !== null && (
        <span
          role="img"
          aria-label={t("pets.progress", { percent })}
          className={`relative block h-2 rounded-full ${onAccent ? "bg-muted desktop:bg-card" : "bg-muted"}`}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </span>
      )}
    </span>
  );
}
