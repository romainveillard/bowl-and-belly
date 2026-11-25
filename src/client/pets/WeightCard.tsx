import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { formatInstantDay, formatKg } from "../lib/format.js";
import { useSettings } from "../settings/settings.js";
import { usePet } from "./pets.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { SPARKLINE_READINGS, Sparkline } from "./Sparkline.js";

/** The selected pet's latest weight on desktop Today, linking to its profile. */
export function WeightCard({ petId }: { petId: number }) {
  const { t, i18n } = useTranslation();
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
  const latest = pet?.weights[0];

  if (!pet || !latest || !settings) {
    return null;
  }
  return (
    <Card>
      <CardHeading
        title={t("today.weightCard")}
        action={
          <Link
            to={`/pets/${pet.id}`}
            className="hit-area text-sm font-semibold underline underline-offset-2"
          >
            {t("today.petProfile")}
          </Link>
        }
      />
      <span className="flex items-baseline gap-1.5">
        <span className="font-display text-figure font-semibold tabular-nums">
          {formatKg(latest.weightG, i18n.language)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("today.weightDate", {
            date: formatInstantDay(latest.measuredAt, settings, pet.today, i18n.language),
          })}
        </span>
      </span>
      {pet.weights.length > 1 && (
        <Sparkline
          readings={pet.weights.slice(0, SPARKLINE_READINGS).toReversed()}
          label={t("weight.sparkline")}
          daySettings={settings}
        />
      )}
    </Card>
  );
}
