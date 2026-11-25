import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../components/ui/layout/Card.js";
import { targetBasis, type PetDetail } from "../pets/pets.js";
import { formatNumber } from "../lib/format.js";

type TargetRow = PetDetail["targets"][number];

export function Stat({
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
    <Card size="compact" className={`flex-1 ${className}`}>
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
    </Card>
  );
}

/**
 * The target in force, noted "Neutered adult, normal" when the formula set it
 * and "Set by you" otherwise. Desktop only: a phone notes it under the average.
 */
export function TargetStat({
  pet,
  row,
  kcal = row?.kcalPerDay ?? null,
}: {
  pet: PetDetail;
  row: TargetRow | undefined;
  /** When the day's summary already holds the target. */
  kcal?: number | null;
}) {
  const { t, i18n } = useTranslation();
  const basis = row && targetBasis(pet, row);
  return (
    <Stat
      className="hidden desktop:flex"
      label={t("insights.target")}
      value={kcal === null ? "–" : formatNumber(kcal, i18n.language)}
      unit={t("common.kcal")}
      note={basis && t(`insights.basis.${basis.kind === "formula" ? basis.row : basis.kind}`)}
    />
  );
}

/** The period's daily average over its full days. */
export function AverageStat({
  averageKcal,
  row,
}: {
  averageKcal: number | null;
  row: TargetRow | undefined;
}) {
  const { t, i18n } = useTranslation();
  return (
    <Stat
      label={t("insights.dailyAverage")}
      value={averageKcal === null ? "–" : formatNumber(averageKcal, i18n.language)}
      unit={t("common.kcal")}
      note={
        <>
          <span className="desktop:hidden">
            {row ? t("insights.targetValue", { kcal: row.kcalPerDay }) : t("insights.noTarget")}
          </span>
          <span className="hidden desktop:inline">{t("insights.fullDaysOnly")}</span>
        </>
      }
    />
  );
}
