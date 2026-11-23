import type { TFunction } from "i18next";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { addDays, addMonths, appDayStart } from "../../shared/app-day.js";
import { periodIntake, rollingAverage, weekStart } from "../../shared/insights.js";
import { DayChart } from "../components/charts/DayChart.js";
import { IntakeChart } from "../components/charts/IntakeChart.js";
import { WeightChart } from "../components/charts/WeightChart.js";
import { BackIcon, ChevronRightIcon } from "../components/icons.js";
import { PetChip } from "../components/PetChip.js";
import { Segmented } from "../components/ui/Segmented.js";
import { FeedRow } from "../components/FeedRow.js";
import { dayStatus, isOverTarget } from "../lib/dayStatus.js";
import { formatDateInput, formatTime, useDay, useDaySettings } from "../lib/feeds.js";
import { foodTypeLabel } from "../lib/foods.js";
import { formatDay, formatKg } from "../lib/format.js";
import { useInsights } from "../lib/insights.js";
import { suggestionFor, usePet, usePets, type PetDetail } from "../lib/pets.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { useFeedSheets } from "./FeedSheets.js";

const card = "rounded-xl bg-card inset-ring inset-ring-border desktop:rounded-[14px]";

function Stat({
  label,
  value,
  unit,
  note,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${card} flex flex-1 flex-col gap-1 p-3.5 desktop:p-[18px] ${className}`}>
      <span className="text-caption text-muted-foreground desktop:text-[13px]">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="font-display text-2xl font-semibold tabular-nums desktop:text-[30px]">
          {value}
        </span>
        {unit && <span className="text-[13px] text-muted-foreground desktop:text-sm">{unit}</span>}
      </span>
      {note && (
        <span className="text-caption text-muted-foreground desktop:text-[13px]">{note}</span>
      )}
    </div>
  );
}

/** "Neutered adult, normal" for a target the formula set, "Set by you" for the user's own. */
function targetBasis(pet: PetDetail, kcal: number, source: "calculated" | "manual", t: TFunction) {
  if (source === "manual") {
    return t("insights.basis.manual");
  }
  const suggestion = suggestionFor(pet);
  if (!suggestion || suggestion.kcalPerDay !== kcal) {
    return t("insights.basis.calculated");
  }
  if (suggestion.basis !== "adult") {
    return t(`insights.basis.${suggestion.basis}`);
  }
  const neutered = pet.neutered ? "Neutered" : "Intact";
  const activity = pet.activityLevel === "active" ? "Active" : "Normal";
  return t(`insights.basis.adult${neutered}${activity}`);
}

type Period = "day" | "week" | "month";
const PERIOD_KEY = "insightsPeriod";

interface ViewProps {
  petId: number;
  today: string;
  onPeriod: (period: Period) => void;
}

function PeriodBar({
  period,
  onPeriod,
  label,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  atLatest,
}: {
  period: Period;
  onPeriod: (period: Period) => void;
  label: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Nothing lies ahead of the current period. */
  atLatest: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-between desktop:gap-4">
      <div className="desktop:w-80">
        <Segmented
          label={t("insights.period")}
          hideLabel
          value={period}
          onChange={onPeriod}
          options={[
            { value: "day", label: t("insights.day") },
            { value: "week", label: t("insights.week") },
            { value: "month", label: t("insights.month") },
          ]}
        />
      </div>
      <div className="flex items-center justify-between desktop:gap-1">
        <button
          type="button"
          aria-label={previousLabel}
          onClick={onPrevious}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full"
        >
          <BackIcon />
        </button>
        <span className="min-w-[120px] text-center text-[15px] font-semibold">{label}</span>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={atLatest}
          onClick={onNext}
          className="flex size-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-default disabled:text-border"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
}

function DayInsights({ petId, today, onPeriod }: ViewProps) {
  const { t, i18n } = useTranslation();
  const [day, setDay] = useState(today);
  const [openedAt] = useState(() => Date.now());
  const isDesktop = useIsDesktop();
  const { data: summary, isPending } = useDay(petId, day);
  const { data: pet } = usePet(petId);
  const { data: settings } = useDaySettings();
  const sheets = useFeedSheets(petId, today, settings?.timeZone ?? "UTC");
  const format = (weekday: "short" | "long") =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday,
      day: "numeric",
      month: weekday,
      timeZone: "UTC",
    }).format(new Date(`${day}T00:00:00Z`));

  const bar = (
    <PeriodBar
      period="day"
      onPeriod={onPeriod}
      label={format(isDesktop ? "long" : "short")}
      previousLabel={t("insights.previousDay")}
      nextLabel={t("insights.nextDay")}
      onPrevious={() => setDay(addDays(day, -1))}
      onNext={() => setDay(addDays(day, 1))}
      atLatest={day === today}
    />
  );
  if (isPending || !pet || !settings) {
    return bar;
  }

  // A past day without feeds has no summary, but still had a target.
  const targetRow = pet.targets.find((row) => row.effectiveFrom <= day);
  const targetKcal = summary ? summary.targetKcal : (targetRow?.kcalPerDay ?? null);
  const eatenKcal = summary?.eatenKcal ?? 0;
  const entries = (summary?.entries ?? []).toReversed();
  const byType = summary?.byType ?? [];
  const lastFeed = entries.at(-1);
  let eatenNote: string | undefined;
  if (targetKcal !== null) {
    eatenNote =
      eatenKcal === targetKcal
        ? t("insights.exactlyOnTarget")
        : eatenKcal < targetKcal
          ? t("insights.underTarget", { kcal: targetKcal - eatenKcal })
          : t("insights.overTarget", { kcal: eatenKcal - targetKcal });
  }
  const split = byType
    .map((total) => t("feed.split", { type: foodTypeLabel(total.type, t), kcal: total.kcal }))
    .join(" · ");

  return (
    <>
      {bar}
      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <Stat
          label={t("insights.eaten")}
          value={eatenKcal}
          unit={t("feed.kcal")}
          note={eatenNote}
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.target")}
          value={targetKcal ?? "–"}
          unit={t("feed.kcal")}
          note={targetRow && targetBasis(pet, targetRow.kcalPerDay, targetRow.source, t)}
        />
        <Stat
          label={t("insights.feeds")}
          value={entries.length}
          note={
            <>
              <span className="desktop:hidden">{split && `${split} ${t("feed.kcal")}`}</span>
              <span className="hidden desktop:inline">
                {lastFeed &&
                  t("insights.lastAt", {
                    time: formatTime(lastFeed.fedAt, settings.timeZone, i18n.language),
                  })}
              </span>
            </>
          }
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.wetDry")}
          value={byType.length === 0 ? "–" : byType.map((total) => total.kcal).join(" / ")}
          unit={t("feed.kcal")}
          note={byType.map((total) => `${total.eatenG} g`).join(" / ")}
        />
      </div>

      <section
        className={`${card} flex flex-col gap-3 px-[18px] py-4 desktop:gap-4 desktop:p-[22px]`}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold desktop:text-base">
            {t("insights.throughDay")}
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {t("insights.dayStartsAt", { time: settings.dayStartsAt })}
          </span>
        </div>
        <DayChart
          entries={entries}
          start={appDayStart(day, settings).getTime()}
          end={appDayStart(addDays(day, 1), settings).getTime()}
          targetKcal={targetKcal}
          timeZone={settings.timeZone}
          now={openedAt}
          label={t("insights.dayLabel", { date: format("long"), kcal: eatenKcal })}
        />
      </section>

      <section className={`${card} flex flex-col gap-1 pt-4 desktop:pt-[22px]`}>
        <h2 className="px-[18px] text-[15px] font-semibold desktop:px-[22px] desktop:text-base">
          {t("insights.feedList")}
        </h2>
        {entries.length === 0 ? (
          <p className="px-[18px] pb-4 text-[13px] text-muted-foreground desktop:px-[22px] desktop:pb-[22px]">
            {t("insights.noFeedsDay")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-b-xl desktop:rounded-b-[14px]">
            {entries.map((entry) => (
              <FeedRow
                key={entry.id}
                entry={entry}
                timeZone={settings.timeZone}
                onOpen={() => sheets.open(entry, day)}
                onLogAgain={() => sheets.logAgain(entry)}
                onDelete={() => sheets.remove(entry)}
              />
            ))}
          </div>
        )}
      </section>
      {sheets.sheet}
    </>
  );
}

/** "Steady this month", or how far the rolling average moved over the month's readings. */
function weightTrend(averagesG: number[], locale: string, t: TFunction): string | undefined {
  const first = averagesG[0];
  const last = averagesG.at(-1);
  if (first === undefined || last === undefined || averagesG.length < 2) {
    return undefined;
  }
  const change = last - first;
  // Within 1% either way reads as steady: scales and fur are not that precise.
  if (Math.abs(change) < first * 0.01) {
    return t("insights.steady");
  }
  const weight = formatKg(Math.abs(change), locale);
  return t(change > 0 ? "insights.up" : "insights.down", { weight });
}

function MonthInsights({ petId, today, onPeriod }: ViewProps) {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState(() => `${today.slice(0, 7)}-01`);
  const next = addMonths(start, 1);
  const end = addDays(next, -1);
  const { data } = useInsights(petId, start, end, addDays(start, -7));
  const { data: pet } = usePet(petId);
  const { data: settings } = useDaySettings();
  const isCurrentMonth = start === `${today.slice(0, 7)}-01`;
  const month = new Intl.DateTimeFormat(i18n.language, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${start}T00:00:00Z`));

  const bar = (
    <PeriodBar
      period="month"
      onPeriod={onPeriod}
      label={month}
      previousLabel={t("insights.previousMonth")}
      nextLabel={t("insights.nextMonth")}
      onPrevious={() => setStart(addMonths(start, -1))}
      onNext={() => setStart(next)}
      atLatest={isCurrentMonth}
    />
  );
  if (!data || !pet || !settings) {
    return bar;
  }

  const [intake] = periodIntake(data.days, "month", data.today);
  const counted = data.days.filter(
    (day) => day.fed && day.day < data.today && day.targetKcal !== null,
  );
  const onTarget = counted.filter((day) => dayStatus(day, data.today) === "onTarget");
  const lastDay = isCurrentMonth ? data.today : end;
  const targetRow = pet.targets.find((row) => row.effectiveFrom <= lastDay);
  const inMonth = rollingAverage(data.weights).filter((reading) => {
    const day = formatDateInput(new Date(reading.at), settings.timeZone);
    return day >= start && day <= end;
  });
  const latest = inMonth.at(-1);

  return (
    <>
      {bar}
      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <Stat
          label={t("insights.dailyAverage")}
          value={intake?.averageKcal ?? "–"}
          unit={t("feed.kcal")}
          note={
            <>
              <span className="desktop:hidden">
                {targetRow
                  ? t("insights.targetValue", { kcal: targetRow.kcalPerDay })
                  : t("insights.noTarget")}
              </span>
              <span className="hidden desktop:inline">{t("insights.fullDaysOnly")}</span>
            </>
          }
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.target")}
          value={targetRow?.kcalPerDay ?? "–"}
          unit={t("feed.kcal")}
          note={targetRow && targetBasis(pet, targetRow.kcalPerDay, targetRow.source, t)}
        />
        <Stat
          label={t("insights.onTarget")}
          value={counted.length === 0 ? "–" : onTarget.length}
          unit={t("insights.ofDays", { count: counted.length })}
          note={t("insights.within")}
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.weight")}
          value={latest ? formatKg(latest.weightG, i18n.language) : "–"}
          unit={t("weight.kg")}
          note={
            weightTrend(
              inMonth.map((reading) => reading.averageG),
              i18n.language,
              t,
            ) ??
            (latest &&
              t("insights.lastWeighed", {
                date: formatDay(new Date(latest.at), pet.today, i18n.language),
              }))
          }
        />
      </div>

      <section
        className={`${card} flex flex-col gap-3 px-[18px] py-4 desktop:gap-4 desktop:p-[22px]`}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold desktop:text-base">{t("insights.calories")}</h2>
          <span className="text-[13px] text-muted-foreground">{t("insights.oneBarPerDay")}</span>
        </div>
        <IntakeChart
          days={data.days}
          today={data.today}
          axis="monthDay"
          height={180}
          label={t("insights.monthLabel", { month })}
        />
      </section>

      {inMonth.length > 0 && (
        <section
          className={`${card} flex flex-col gap-3 px-[18px] py-4 desktop:gap-4 desktop:p-[22px]`}
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold desktop:text-base">
              {t("insights.weightChart")}
            </h2>
            <span className="text-[13px] text-muted-foreground">
              {t("insights.weighIns", { count: inMonth.length })}
            </span>
          </div>
          <WeightChart
            readings={data.weights}
            from={start}
            to={end}
            tickEvery={7}
            timeZone={settings.timeZone}
            height={150}
            label={t("insights.monthWeightLabel", { month })}
          />
        </section>
      )}
    </>
  );
}

function readPeriod(): Period {
  try {
    const stored = localStorage.getItem(PERIOD_KEY);
    return stored === "day" || stored === "month" ? stored : "week";
  } catch {
    return "week";
  }
}

function WeekInsights({ petId, today, onPeriod }: ViewProps) {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState(() => weekStart(today));
  const end = addDays(start, 6);
  const { data } = useInsights(petId, start, end);
  const { data: pet } = usePet(petId);
  const { data: settings } = useDaySettings();
  const timeZone = settings?.timeZone ?? "UTC";
  const isCurrentWeek = start === weekStart(today);

  const range = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`));

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

  if (!data || !pet) {
    return bar;
  }

  const [week] = periodIntake(data.days, "week", data.today);
  const counted = data.days.filter(
    (day) => day.fed && day.day !== data.today && day.targetKcal !== null,
  );
  const over = counted.filter((day) => isOverTarget(day.eatenKcal, day.targetKcal));
  const weekday = new Intl.DateTimeFormat(i18n.language, { weekday: "long", timeZone: "UTC" });
  const overNames = new Intl.ListFormat(i18n.language, { type: "conjunction" }).format(
    over.map((day) => weekday.format(new Date(`${day.day}T00:00:00Z`))),
  );

  // The target that applied at the end of the week shown, or today for this week.
  const lastDay = isCurrentWeek ? data.today : end;
  const targetRow = pet.targets.find((row) => row.effectiveFrom <= lastDay);
  const latest = pet.weights[0];
  const weightNote = latest && formatDay(new Date(latest.measuredAt), pet.today, i18n.language);

  return (
    <>
      {bar}

      <div className="flex gap-3 desktop:grid desktop:grid-cols-4 desktop:gap-4">
        <Stat
          label={t("insights.dailyAverage")}
          value={week?.averageKcal ?? "–"}
          unit={t("feed.kcal")}
          note={
            <>
              <span className="desktop:hidden">
                {targetRow
                  ? t("insights.targetValue", { kcal: targetRow.kcalPerDay })
                  : t("insights.noTarget")}
              </span>
              <span className="hidden desktop:inline">{t("insights.fullDaysOnly")}</span>
            </>
          }
        />
        <Stat
          className="hidden desktop:flex"
          label={t("insights.target")}
          value={targetRow?.kcalPerDay ?? "–"}
          unit={t("feed.kcal")}
          note={targetRow && targetBasis(pet, targetRow.kcalPerDay, targetRow.source, t)}
        />
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

      <section
        className={`${card} flex flex-col gap-3 px-[18px] py-4 desktop:gap-4 desktop:p-[22px]`}
      >
        <h2 className="text-[15px] font-semibold desktop:text-base">{t("insights.calories")}</h2>
        <IntakeChart
          days={data.days}
          today={data.today}
          label={t("insights.caloriesLabel", { range })}
        />
      </section>

      {data.weights.length > 0 && (
        <section
          className={`${card} flex flex-col gap-3 px-[18px] py-4 desktop:gap-4 desktop:p-[22px]`}
        >
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold desktop:text-base">
              {t("insights.weightChart")}
            </h2>
            <span className="hidden text-[13px] text-muted-foreground desktop:inline">
              {t("insights.lastWeeks")}
            </span>
          </div>
          <WeightChart
            readings={data.weights}
            from={addDays(data.today, -55)}
            to={data.today}
            tickEvery={14}
            timeZone={timeZone}
            label={t("insights.weightLabel")}
          />
        </section>
      )}
    </>
  );
}

export function InsightsScreen() {
  const { t } = useTranslation();
  const { data: pets } = usePets();
  const { pet } = useSelectedPet();
  // Per device, like the selected pet and the language.
  const [period, setPeriod] = useState(readPeriod);

  if (!pets || !pet) {
    return null;
  }
  const view: ViewProps = {
    petId: pet.id,
    today: pets.today,
    onPeriod: (next) => {
      setPeriod(next);
      try {
        localStorage.setItem(PERIOD_KEY, next);
      } catch {
        // The period resets on the next visit; harmless.
      }
    },
  };
  return (
    <div className="flex flex-col gap-3.5 desktop:gap-6">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 desktop:p-0">
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {t("nav.insights")}
        </h1>
        <PetChip />
      </header>
      <div className="flex flex-col gap-3.5 px-5 pb-6 desktop:gap-6 desktop:p-0 desktop:pb-10">
        {period === "day" && <DayInsights key={pet.id} {...view} />}
        {period === "week" && <WeekInsights key={pet.id} {...view} />}
        {period === "month" && <MonthInsights key={pet.id} {...view} />}
      </div>
    </div>
  );
}
