import type { TFunction } from "i18next";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { addDays } from "../../shared/app-day.js";
import { periodIntake, weekStart } from "../../shared/insights.js";
import { IntakeChart } from "../components/charts/IntakeChart.js";
import { WeightChart } from "../components/charts/WeightChart.js";
import { BackIcon, ChevronRightIcon } from "../components/icons.js";
import { PetChip } from "../components/PetChip.js";
import { Segmented } from "../components/ui/Segmented.js";
import { isOverTarget } from "../lib/dayStatus.js";
import { formatDay, formatKg } from "../lib/format.js";
import { useInsights } from "../lib/insights.js";
import { suggestionFor, usePet, usePets, type PetDetail } from "../lib/pets.js";
import { useSelectedPet } from "../lib/selectedPet.js";

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

function WeekInsights({ petId, today }: { petId: number; today: string }) {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState(() => weekStart(today));
  const end = addDays(start, 6);
  const { data } = useInsights(petId, start, end);
  const { data: pet } = usePet(petId);
  const isCurrentWeek = start === weekStart(today);

  const range = new Intl.DateTimeFormat(i18n.language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatRange(new Date(`${start}T00:00:00Z`), new Date(`${end}T00:00:00Z`));

  const navigation = (
    <div className="flex items-center justify-between desktop:gap-1">
      <button
        type="button"
        aria-label={t("insights.previousWeek")}
        onClick={() => setStart(addDays(start, -7))}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full"
      >
        <BackIcon />
      </button>
      <span className="min-w-[120px] text-center text-[15px] font-semibold">{range}</span>
      <button
        type="button"
        aria-label={t("insights.nextWeek")}
        disabled={isCurrentWeek}
        onClick={() => setStart(addDays(start, 7))}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full disabled:cursor-default disabled:text-border"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );

  const period = (
    <div className="desktop:w-80">
      <Segmented
        label={t("insights.period")}
        hideLabel
        value="week"
        onChange={() => undefined}
        options={[
          { value: "day", label: t("insights.day"), disabled: true },
          { value: "week", label: t("insights.week") },
          { value: "month", label: t("insights.month"), disabled: true },
        ]}
      />
    </div>
  );

  if (!data || !pet) {
    return (
      <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-between desktop:gap-4">
        {period}
        {navigation}
      </div>
    );
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
      <div className="flex flex-col gap-3 desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-between desktop:gap-4">
        {period}
        {navigation}
      </div>

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
            today={data.today}
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

  if (!pets || !pet) {
    return null;
  }
  return (
    <div className="flex flex-col gap-3.5 desktop:gap-6">
      <header className="flex items-center justify-between gap-4 px-5 pt-5 desktop:p-0">
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {t("nav.insights")}
        </h1>
        <PetChip />
      </header>
      <div className="flex flex-col gap-3.5 px-5 pb-6 desktop:gap-6 desktop:p-0 desktop:pb-10">
        <WeekInsights key={pet.id} petId={pet.id} today={pets.today} />
      </div>
    </div>
  );
}
