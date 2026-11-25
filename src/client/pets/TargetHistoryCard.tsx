import { useTranslation } from "react-i18next";
import { addDays } from "../../shared/app-day.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { listRow } from "../components/ui/layout/List.js";
import { formatDay } from "../lib/format.js";
import type { PetDetail } from "./pets.js";

/** Each target the pet has had, newest first, with the days it applied. */
export function TargetHistoryCard({ pet }: { pet: PetDetail }) {
  const { t, i18n } = useTranslation();
  const day = (value: string) => formatDay(value, pet.today, i18n.language);

  return (
    <Card>
      <CardHeading title={t("target.history")} hint={t("target.historyHint")} />
      <div>
        {pet.targets.map((row, index) => {
          const next = pet.targets[index - 1];
          const title = next
            ? t("target.range", {
                from: day(row.effectiveFrom),
                to: day(addDays(next.effectiveFrom, -1)),
              })
            : row.effectiveFrom === pet.today
              ? t("target.sinceToday")
              : t("target.since", { date: day(row.effectiveFrom) });
          return (
            <div
              key={row.effectiveFrom}
              className={`flex min-h-12 items-center justify-between gap-3 ${listRow}`}
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px]">{title}</span>
                <span className="text-[13px] text-muted-foreground">
                  {t(`target.${row.source}`)}
                </span>
              </span>
              <span className="text-[15px] font-semibold tabular-nums">
                {t("target.kcal", { kcal: row.kcalPerDay })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
