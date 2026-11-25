import { useState } from "react";
import { useTranslation } from "react-i18next";
import { button } from "../components/ui/forms/button.js";
import { Card, CardHeading } from "../components/ui/layout/Card.js";
import { formatSince } from "../lib/format.js";
import { ManualTargetSheet } from "./ManualTargetSheet.js";
import { suggestionFor, targetBasis, type PetDetail } from "./pets.js";

/** The daily target on the profile, with how it was worked out. */
export function ProfileTargetCard({ pet }: { pet: PetDetail }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [settingTarget, setSettingTarget] = useState(false);
  const target = pet.targets[0];
  const since = (value: string) => formatSince(value, pet.today, locale, t);

  let note = t("target.none");
  const basis = target && targetBasis(pet, target);
  if (target && basis?.kind === "manual") {
    note = t("target.manualSince", { since: since(target.effectiveFrom) });
  } else if (target && basis?.kind === "formula" && pet.type.systemKey) {
    let profile = t(`target.profile.${pet.type.systemKey}.${basis.row}`);
    if (pet.goal !== "maintain" && basis.suggestion.basis !== "growth") {
      profile = t("target.profile.atTargetWeight", { profile });
    }
    note = t("target.calculatedSinceHow", {
      since: since(target.effectiveFrom),
      resting: basis.suggestion.restingKcal,
      factor: new Intl.NumberFormat(locale).format(basis.suggestion.factor),
      profile,
    });
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
              {target.kcalPerDay}
            </span>
            <span className="text-[15px] text-muted-foreground">{t("target.perDay")}</span>
          </span>
        )}
        <span className="text-[13px] text-muted-foreground">{note}</span>
        <button
          type="button"
          className={`${button.outline} self-start`}
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
