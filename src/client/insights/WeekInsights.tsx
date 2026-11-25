import { useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays } from "../../shared/app-day.js";
import { periodIntake, weekStart } from "../../shared/insights.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { isOverTarget } from "../lib/dayStatus.js";
import { formatAppDay, formatAppDayRange, formatInstantDay, formatKg } from "../lib/format.js";
import { targetOn, usePet } from "../pets/pets.js";
import { IntakeChart } from "./charts/IntakeChart.js";
import { WeightChart } from "./charts/WeightChart.js";
import { PeriodBar, type PeriodViewProps } from "./PeriodBar.js";
import { AverageStat, Stat, TargetStat } from "./Stat.js";
import { useInsights } from "./useInsights.js";
import { useSettings } from "../settings/settings.js";

export function WeekInsights({ petId, today, onPeriod }: PeriodViewProps) {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState(() => weekStart(today));
  const end = addDays(start, 6);
  const { data } = useInsights(petId, start, end);
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
  const isCurrentWeek = start === weekStart(today);

  const range = formatAppDayRange(start, end, i18n.language, { day: "numeric", month: "short" });

  const bar = (
    <PeriodBar
      period="week"
      onPeriod={onPeriod}
      label={range}
      previousLabel={t("insights.previousWeek")}
      nextLabel={t("insights.nextWeek")}
      onPrevious={() => setStart(addDays(start, -7))}
      onNext={() => setStart(addDays(start, 7))}
      atLatest={isCurrentWeek}
    />
  );

  if (!data || !pet || !settings) {
    return bar;
  }

  const [week] = periodIntake(data.days, "week", data.today);
  const counted = data.days.filter(
    (day) => day.fed && day.day !== data.today && day.targetKcal !== null,
  );
  const over = counted.filter((day) => isOverTarget(day.eatenKcal, day.targetKcal));
  const overNames = new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(
    over.map((day) => formatAppDay(day.day, i18n.language, { weekday: "long" })),
  );

  // The target that applied at the end of the week shown, or today for this week.
  const lastDay = isCurrentWeek ? data.today : end;
  const targetRow = targetOn(pet, lastDay);
  const latest = pet.weights[0];
  const weightNote =
    latest && formatInstantDay(latest.measuredAt, settings, pet.today, i18n.language);

  return (
    <>
      {bar}

      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <AverageStat averageKcal={week?.averageKcal ?? null} row={targetRow} />
        <TargetStat pet={pet} row={targetRow} />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.onOrUnder")}
          value={counted.length === 0 ? "–" : counted.length - over.length}
          unit={t("insights.ofDays", { count: counted.length })}
          note={
            counted.length === 0
              ? undefined
              : over.length === 0
                ? t("insights.noneOver")
                : t("insights.wentOver", { days: overNames })
          }
        />
        <Stat
          label={t("insights.weight")}
          value={latest ? formatKg(latest.weightG, i18n.language) : "–"}
          unit={t("weight.kg")}
          note={
            weightNote && (
              <>
                <span className="desktop:hidden">{weightNote}</span>
                <span className="hidden desktop:inline">
                  {t("insights.lastWeighed", { date: weightNote })}
                </span>
              </>
            )
          }
        />
      </div>

      <Card>
        <CardHeading title={t("insights.calories")} />
        <IntakeChart
          days={data.days}
          today={data.today}
          label={t("insights.caloriesLabel", { range })}
        />
      </Card>

      {data.weights.length > 0 && (
        <Card>
          <CardHeading title={t("insights.weightChart")} hint={t("insights.lastWeeks")} />
          <WeightChart
            readings={data.weights}
            from={addDays(data.today, -55)}
            to={data.today}
            tickEvery={14}
            daySettings={settings}
            label={t("insights.weightLabel")}
          />
        </Card>
      )}
    </>
  );
}
