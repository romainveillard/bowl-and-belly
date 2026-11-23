import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatDay, formatKg } from "../lib/format.js";
import { usePet } from "../lib/pets.js";
import { Sparkline } from "./Sparkline.js";

/** The selected pet's latest weight on desktop Today, linking to its profile. */
export function WeightCard({ petId }: { petId: number }) {
  const { t, i18n } = useTranslation();
  const { data: pet } = usePet(petId);
  const latest = pet?.weights[0];

  if (!pet || !latest) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4 rounded-[14px] bg-card p-[22px] inset-ring inset-ring-border">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{t("today.weightCard")}</h2>
        <Link to={`/pets/${pet.id}`} className="text-sm font-semibold">
          {t("today.petProfile")}
        </Link>
      </div>
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-figure font-semibold tabular-nums">
          {formatKg(latest.weightG, i18n.language)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("today.weightDate", {
            date: formatDay(new Date(latest.measuredAt), pet.today, i18n.language),
          })}
        </span>
      </span>
      {pet.weights.length > 1 && (
        <Sparkline
          weightsG={pet.weights.map((reading) => reading.weightG).toReversed()}
          label={t("weight.sparkline")}
        />
      )}
    </section>
  );
}
