import { useState } from "react";
import { useTranslation } from "react-i18next";
import { EditIcon, PlusIcon, TrashIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { listRow, RowHoverActions } from "../components/ui/layout/List.js";
import { formatInstantDay, formatKg, formatReadingKg } from "../lib/format.js";
import { useFocusNext } from "../lib/useFocusNext.js";
import { useSettings } from "../settings/settings.js";
import type { PetDetail } from "./pets.js";
import { SPARKLINE_READINGS, Sparkline } from "./Sparkline.js";
import { useWeightSheets } from "./WeightSheetsProvider.js";

/** Weigh-ins listed before "Show all", which reveals the rest in place. */
const LATEST_READINGS = 3;

/** The profile's latest weight, its trend and the weigh-ins, inside a WeightSheetsProvider. */
export function WeighInsCard({ pet }: { pet: PetDetail }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const weightSheets = useWeightSheets();
  const [showAll, setShowAll] = useState(false);
  const focusNext = useFocusNext();
  const latest = pet.weights[0];
  const { data: settings } = useSettings();
  const day = (measuredAt: string) =>
    settings ? formatInstantDay(measuredAt, settings, pet.today, locale) : "";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <CardHeading
          title={t("weight.title")}
          hint={latest && t("weight.lastWeighed", { date: day(latest.measuredAt) })}
        />
        {latest && (
          <span className="flex items-baseline gap-1">
            <span className="font-display text-figure font-semibold tabular-nums desktop:text-4xl">
              {formatKg(latest.weightG, locale)}
            </span>
            <span className="text-sm text-muted-foreground">{t("common.kg")}</span>
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
          {pet.weights.slice(0, showAll ? undefined : LATEST_READINGS).map((reading) => {
            const date = day(reading.measuredAt);
            return (
              <div
                key={reading.id}
                data-reading={reading.id}
                className={`group relative ${listRow}`}
              >
                <button
                  type="button"
                  onClick={() => weightSheets.openActions(reading)}
                  className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 text-left desktop:cursor-default"
                >
                  <span className="text-[15px]">{date}</span>
                  <span className="text-[15px] font-semibold tabular-nums">
                    {t("weight.reading", { weight: formatReadingKg(reading.weightG, locale) })}
                  </span>
                </button>
                <RowHoverActions
                  className="right-20"
                  actions={[
                    {
                      icon: <EditIcon size={18} />,
                      label: t("weighIn.editNamed", { date }),
                      onClick: () => weightSheets.edit(reading),
                    },
                    {
                      icon: <TrashIcon size={18} />,
                      label: t("weighIn.deleteNamed", { date }),
                      onClick: () => weightSheets.remove(reading),
                      danger: true,
                    },
                  ]}
                />
              </div>
            );
          })}
          {!showAll && pet.weights.length > LATEST_READINGS && (
            <button
              type="button"
              onClick={() => {
                setShowAll(true);
                const first = pet.weights[LATEST_READINGS]?.id;
                focusNext(() => document.querySelector(`[data-reading="${first}"] button`));
              }}
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
  );
}
