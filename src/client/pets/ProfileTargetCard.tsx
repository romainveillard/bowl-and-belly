import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { addDays } from "../../shared/app-day.js";
import { periodIntake, weekStart } from "../../shared/insights.js";
import { NoValue } from "../components/Figures.js";
import { button } from "../components/ui/forms/button.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { useInsights } from "../insights/useInsights.js";
import { onTargetDays } from "../lib/dayStatus.js";
import { formatInstantDay, formatKg, formatNumber, formatSince } from "../lib/format.js";
import { useSettings, type Settings } from "../settings/settings.js";
import { goalProgress } from "./goal.js";
import { ManualTargetSheet } from "./ManualTargetSheet.js";
import { suggestionFor, targetBasis, type PetDetail } from "./pets.js";

/** The daily target on the profile: how it was worked out, the goal so far and this week. */
export function ProfileTargetCard({ pet }: { pet: PetDetail }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [settingTarget, setSettingTarget] = useState(false);
  const { data: settings } = useSettings();
  const target = pet.targets[0];
  const since = (value: string) => formatSince(value, pet.today, locale, t);

  let note = t("target.none");
  const basis = target && targetBasis(pet, target);
  if (target && basis?.kind === "manual") {
    note = t("target.manualSince", { since: since(target.effectiveFrom) });
  } else if (target && basis?.kind === "formula" && pet.type.systemKey) {
    const { suggestion } = basis;
    // "× 1" says nothing: a goal at factor 1 is the resting needs at the target weight.
    if (
      pet.goal !== "maintain" &&
      pet.targetWeightG !== null &&
      suggestion.basis !== "growth" &&
      suggestion.factor === 1
    ) {
      note = t(pet.goal === "lose" ? "target.forLoss" : "target.forGain", {
        since: since(target.effectiveFrom),
        weight: formatKg(pet.targetWeightG, locale),
      });
    } else {
      let profile = t(`target.profile.${pet.type.systemKey}.${basis.row}`);
      if (pet.goal !== "maintain" && suggestion.basis !== "growth") {
        profile = t("target.profile.atTargetWeight", { profile });
      }
      note = t("target.calculatedSinceHow", {
        since: since(target.effectiveFrom),
        resting: suggestion.restingKcal,
        factor: new Intl.NumberFormat(locale).format(suggestion.factor),
        profile,
      });
    }
  } else if (target) {
    note = t("target.calculatedSince", { since: since(target.effectiveFrom) });
  }

  return (
    <>
      <Card>
        <CardHeading title={t("target.title")} />
        {target && (
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[32px] font-semibold tabular-nums desktop:text-4xl">
              {formatNumber(target.kcalPerDay, locale)}
            </span>
            <span className="text-[15px] text-muted-foreground">{t("target.perDay")}</span>
          </span>
        )}
        <span className="text-[13px] leading-[19px] text-muted-foreground">{note}</span>
        {/* Custom types have no formula to aim with, so their target card shows this week only. */}
        {pet.type.systemKey && settings && <GoalProgress pet={pet} settings={settings} />}
        <ThisWeek pet={pet} />
        <button
          type="button"
          // Beside the Weight card on desktop, both cards' actions line up at the bottom.
          className={`${button.outline} self-start desktop:mt-auto`}
          onClick={() => setSettingTarget(true)}
        >
          {t("target.setOwn")}
        </button>
      </Card>

      {settingTarget && (
        <ManualTargetSheet
          petId={pet.id}
          petName={pet.name}
          currentKcal={target?.kcalPerDay ?? null}
          suggestedKcal={suggestionFor(pet)?.kcalPerDay ?? null}
          onClose={() => setSettingTarget(false)}
        />
      )}
    </>
  );
}

/** "Goal: 22.0 kg · 1.3 kg to go", on a bar from the weight when the goal was set. */
function GoalProgress({ pet, settings }: { pet: PetDetail; settings: Settings }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const progress = goalProgress(pet, settings);
  if (!progress) {
    return null;
  }
  const kg = (grams: number) => formatKg(grams, locale);
  const along = `${Math.round(progress.fraction * 100)}%`;

  return (
    <div className="flex flex-col gap-2 rounded-[10px] bg-background p-3.5">
      <div className="flex items-baseline justify-between gap-3 text-sm font-semibold">
        <span>{t("target.goal", { weight: kg(progress.targetWeightG) })}</span>
        <span className="tabular-nums">
          {progress.reached
            ? t("target.goalReached")
            : t("target.toGo", { weight: kg(progress.remainingG) })}
        </span>
      </div>
      <span
        role="img"
        aria-label={t("target.goalBar", {
          now: kg(progress.latest.weightG),
          start: kg(progress.start.weightG),
          goal: kg(progress.targetWeightG),
        })}
        className="relative block h-2 rounded-full bg-muted"
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-primary"
          style={{ width: along }}
        />
        <span
          className="absolute -top-1 -ml-0.5 h-4 w-1 rounded-sm bg-foreground"
          style={{ left: along }}
        />
      </span>
      <div className="flex justify-between gap-2 text-caption text-muted-foreground tabular-nums">
        <span>
          {t("target.goalStart", {
            weight: kg(progress.start.weightG),
            date: formatInstantDay(progress.start.measuredAt, settings, pet.today, locale),
          })}
        </span>
        <span className="font-semibold text-foreground">
          {t("target.goalNow", { weight: kg(progress.latest.weightG) })}
        </span>
        <span>{t("weight.reading", { weight: kg(progress.targetWeightG) })}</span>
      </div>
    </div>
  );
}

/** The week so far: the average of its finished days, and how many were on target. */
function ThisWeek({ pet }: { pet: PetDetail }) {
  const { t, i18n } = useTranslation();
  const start = weekStart(pet.today);
  const { data } = useInsights(pet.id, start, addDays(start, 6));
  const [week] = data ? periodIntake(data.days, "week", data.today) : [];
  const days = data ? onTargetDays(data.days, data.today) : { counted: 0, onTarget: 0 };
  const averageKcal = week?.averageKcal ?? null;

  return (
    <div className="flex gap-4 border-t border-border pt-3.5">
      <WeekFigure
        value={averageKcal === null ? null : formatNumber(averageKcal, i18n.language)}
        unit={t("common.kcal")}
        label={t("target.weekAverage")}
      />
      <WeekFigure
        value={days.counted === 0 ? null : formatNumber(days.onTarget, i18n.language)}
        unit={t("target.ofDays", { count: days.counted })}
        label={t("target.weekOnTarget")}
      />
    </div>
  );
}

function WeekFigure({
  value,
  unit,
  label,
}: {
  value: string | null;
  unit: ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5">
      <span className="flex items-baseline gap-1">
        <span className="font-display text-[22px] font-semibold tabular-nums">
          {value ?? <NoValue />}
        </span>
        {value !== null && <span className="text-[13px] text-muted-foreground">{unit}</span>}
      </span>
      <span className="text-caption text-muted-foreground">{label}</span>
    </div>
  );
}
