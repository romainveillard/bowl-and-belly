import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { addDays } from "../../shared/app-day.js";
import { BackIcon, EditIcon, PlusIcon, TrashIcon } from "../components/icons.js";
import { PetAvatar } from "../components/PetAvatar.js";
import { SPARKLINE_READINGS, Sparkline } from "../components/Sparkline.js";
import { button } from "../components/ui/button.js";
import { Card, CardHeading } from "../components/ui/Card.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import {
  formatAge,
  formatDay,
  formatKg,
  formatReadingKg,
  formatSince,
  petTypeLabel,
} from "../lib/format.js";
import { suggestionFor, targetBasis, usePet, useSetArchived } from "../lib/pets.js";
import { AgePrompt } from "./AgePrompt.js";
import { ManualTargetSheet } from "./ManualTargetSheet.js";
import type { useWeightSheets } from "./WeightSheets.js";

function Rows({ rows }: { rows: { key: string; title: string; note?: string; value: string }[] }) {
  return (
    <div>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex min-h-12 items-center justify-between gap-3 border-t border-border first:border-t-0"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px]">{row.title}</span>
            {row.note && <span className="text-[13px] text-muted-foreground">{row.note}</span>}
          </span>
          <span className="text-[15px] font-semibold tabular-nums">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Weigh-ins listed before "Show all", which reveals the rest in place. */
const LATEST_READINGS = 3;

export function PetProfile({
  petId,
  weightSheets,
}: {
  petId: number;
  /** Owned by the Pets screen, which also offers Log weight on desktop. */
  weightSheets: ReturnType<typeof useWeightSheets>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const { data: pet } = usePet(petId);
  const [settingTarget, setSettingTarget] = useState(false);
  const [showAllWeights, setShowAllWeights] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const archive = useSetArchived("archive");
  const navigate = useNavigate();

  if (!pet) {
    return null;
  }

  const day = (value: string | Date) => formatDay(value, pet.today, locale);
  const since = (value: string) => formatSince(value, pet.today, locale, t);
  const target = pet.targets[0];
  const suggestion = suggestionFor(pet);
  const latest = pet.weights[0];

  const identity = [
    petTypeLabel(pet.type, t),
    formatAge(pet, pet.today, t),
    t(pet.neutered ? "pets.neutered" : "pets.intact"),
  ];
  const lifestyle = [t(`pets.activity.${pet.activityLevel}`), t(`pets.goal.${pet.goal}`)];

  let targetNote = t("target.none");
  const basis = target && targetBasis(pet, target);
  if (target && basis?.kind === "manual") {
    targetNote = t("target.manualSince", { since: since(target.effectiveFrom) });
  } else if (target && basis?.kind === "formula" && pet.type.systemKey) {
    let profile = t(`target.profile.${pet.type.systemKey}.${basis.row}`);
    if (pet.goal !== "maintain" && basis.suggestion.basis !== "growth") {
      profile = t("target.profile.atTargetWeight", { profile });
    }
    targetNote = t("target.calculatedSinceHow", {
      since: since(target.effectiveFrom),
      resting: basis.suggestion.restingKcal,
      factor: new Intl.NumberFormat(locale).format(basis.suggestion.factor),
      profile,
    });
  } else if (target) {
    targetNote = t("target.calculatedSince", { since: since(target.effectiveFrom) });
  }

  const editLink = `/pets/${pet.id}/edit`;

  return (
    <div className="flex flex-col gap-3.5 desktop:gap-6">
      <header className="flex items-center justify-between px-3 pt-3 desktop:hidden">
        <Link to="/pets" aria-label={t("pets.back")} className={button.icon}>
          <BackIcon />
        </Link>
        <Link to={editLink} aria-label={t("pets.edit")} className={button.icon}>
          <EditIcon />
        </Link>
      </header>

      <div className="flex flex-col gap-3.5 px-5 pb-5 desktop:gap-6 desktop:p-0">
        <div className="flex flex-col items-center gap-2 pt-1 pb-2 text-center desktop:hidden">
          <PetAvatar photoId={pet.photoId} size={88} />
          <h1 className="mt-1 font-display text-[26px] leading-8 font-semibold">{pet.name}</h1>
          <span className="text-sm text-muted-foreground">{identity.join(" · ")}</span>
          <span className="text-sm text-muted-foreground">
            {lifestyle[0]} · {lifestyle[1]}
          </span>
        </div>

        <Card className="hidden desktop:flex desktop:flex-row desktop:flex-wrap desktop:items-center desktop:gap-[18px]">
          <PetAvatar photoId={pet.photoId} size={80} />
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <h2 className="font-display text-[28px] font-semibold">{pet.name}</h2>
            <span className="text-sm text-muted-foreground">
              {[...identity, lifestyle[0]?.toLocaleLowerCase(locale), lifestyle[1]].join(" · ")}
            </span>
          </div>
          <Link to={editLink} className={button.outline}>
            <EditIcon size={18} />
            {t("pets.editShort")}
          </Link>
        </Card>

        <div className="grid gap-3.5 desktop:grid-cols-2 desktop:items-start desktop:gap-6">
          <Card>
            <CardHeading title={t("target.title")} />
            {target && (
              <span className="flex items-baseline gap-1.5">
                <span className="font-display text-[32px] font-semibold tabular-nums desktop:text-4xl">
                  {target.kcalPerDay}
                </span>
                <span className="text-[15px] text-muted-foreground">{t("target.perDay")}</span>
              </span>
            )}
            <span className="text-[13px] text-muted-foreground">{targetNote}</span>
            <button
              type="button"
              className={`${button.outline} self-start`}
              onClick={() => setSettingTarget(true)}
            >
              {t("target.setOwn")}
            </button>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <CardHeading
                title={t("weight.title")}
                hint={latest && t("weight.lastWeighed", { date: day(new Date(latest.measuredAt)) })}
              />
              {latest && (
                <span className="flex items-baseline gap-1">
                  <span className="font-display text-figure font-semibold tabular-nums desktop:text-4xl">
                    {formatKg(latest.weightG, locale)}
                  </span>
                  <span className="text-sm text-muted-foreground">{t("weight.kg")}</span>
                </span>
              )}
            </div>
            {pet.weights.length > 1 && (
              <Sparkline
                weightsG={pet.weights
                  .slice(0, SPARKLINE_READINGS)
                  .map((weight) => weight.weightG)
                  .toReversed()}
                label={t("weight.sparkline")}
              />
            )}
            {pet.weights.length > 0 && (
              <div>
                {pet.weights
                  .slice(0, showAllWeights ? undefined : LATEST_READINGS)
                  .map((reading) => {
                    const date = day(new Date(reading.measuredAt));
                    return (
                      <div
                        key={reading.id}
                        className="group relative border-t border-border first:border-t-0"
                      >
                        <button
                          type="button"
                          onClick={() => weightSheets.openActions(reading)}
                          className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 text-left desktop:cursor-default"
                        >
                          <span className="text-[15px]">{date}</span>
                          <span className="text-[15px] font-semibold tabular-nums">
                            {t("weight.reading", {
                              weight: formatReadingKg(reading.weightG, locale),
                            })}
                          </span>
                        </button>
                        <span className="absolute top-1/2 right-20 hidden -translate-y-1/2 gap-1 desktop:group-focus-within:flex desktop:group-hover:flex">
                          <button
                            type="button"
                            aria-label={t("weighIn.editNamed", { date })}
                            onClick={() => weightSheets.edit(reading)}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted"
                          >
                            <EditIcon size={18} />
                          </button>
                          <button
                            type="button"
                            aria-label={t("weighIn.deleteNamed", { date })}
                            onClick={() => weightSheets.remove(reading)}
                            className="flex size-9 cursor-pointer items-center justify-center rounded-lg bg-muted text-danger"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                {!showAllWeights && pet.weights.length > LATEST_READINGS && (
                  <button
                    type="button"
                    onClick={() => setShowAllWeights(true)}
                    className="flex min-h-11 w-full cursor-pointer items-center border-t border-border text-sm font-semibold"
                  >
                    {t("weight.showAll", { count: pet.weights.length })}
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              className={`${button.outline} self-start desktop:hidden`}
              onClick={weightSheets.openLog}
            >
              <PlusIcon size={18} />
              {t("logWeight.button")}
            </button>
          </Card>
        </div>

        {pet.targets.length > 0 && (
          <Card>
            <CardHeading title={t("target.history")} hint={t("target.historyHint")} />
            <Rows
              rows={pet.targets.map((row, index) => {
                const next = pet.targets[index - 1];
                return {
                  key: row.effectiveFrom,
                  title: next
                    ? t("target.range", {
                        from: day(row.effectiveFrom),
                        to: day(addDays(next.effectiveFrom, -1)),
                      })
                    : row.effectiveFrom === pet.today
                      ? t("target.sinceToday")
                      : t("target.since", { date: day(row.effectiveFrom) }),
                  note: t(`target.${row.source}`),
                  value: t("target.kcal", { kcal: row.kcalPerDay }),
                };
              })}
            />
          </Card>
        )}

        <button
          type="button"
          className={`${button.dangerGhost} self-center desktop:self-start`}
          onClick={() => setArchiving(true)}
        >
          {t("pets.archive")}
        </button>
      </div>

      <ConfirmDialog
        open={archiving}
        onOpenChange={setArchiving}
        title={t("pets.archiveTitle", { name: pet.name })}
        description={
          <>
            <span className="desktop:hidden">{t("pets.archiveBody")}</span>
            <span className="hidden desktop:inline">{t("pets.archiveBodyDesktop")}</span>
          </>
        }
        confirmLabel={t("pets.archiveConfirm")}
        onConfirm={() => archive.mutate(pet.id, { onSuccess: () => navigate("/pets") })}
      />

      <AgePrompt petId={pet.id} petName={pet.name} />

      {settingTarget && (
        <ManualTargetSheet
          petId={pet.id}
          petName={pet.name}
          currentKcal={target?.kcalPerDay ?? null}
          suggestedKcal={suggestion?.kcalPerDay ?? null}
          onClose={() => setSettingTarget(false)}
        />
      )}
    </div>
  );
}
