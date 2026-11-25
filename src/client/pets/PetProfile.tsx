import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { BackIcon, EditIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
import { Card } from "../components/ui/layout/Card.js";
import { ConfirmDialog } from "../components/ui/overlays/ConfirmDialog.js";
import { formatAge } from "../lib/format.js";
import { AgePrompt } from "./AgePrompt.js";
import { PetAvatar } from "./PetAvatar.js";
import { petTypeLabel, usePet, useSetArchived } from "./pets.js";
import { ProfileTargetCard } from "./ProfileTargetCard.js";
import { TargetHistoryCard } from "./TargetHistoryCard.js";
import { WeighInsCard } from "./WeighInsCard.js";

/** A pet's profile, inside the Pets screen's WeightSheetsProvider. */
export function PetProfile({ petId }: { petId: number }) {
  const { t } = useTranslation();
  const { data: pet } = usePet(petId);
  const [archiving, setArchiving] = useState(false);
  const archive = useSetArchived("archive");
  const navigate = useNavigate();

  if (!pet) {
    return null;
  }

  const identity = [
    petTypeLabel(pet.type, t),
    formatAge(pet, pet.today, t),
    t(pet.neutered ? "pets.neutered" : "pets.intact"),
  ];
  const lifestyle = [t(`pets.activity.${pet.activityLevel}`), t(`pets.goal.${pet.goal}`)];
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
              {[...identity, t(`pets.activityInline.${pet.activityLevel}`), lifestyle[1]].join(
                " · ",
              )}
            </span>
          </div>
          <Link to={editLink} className={button.outline}>
            <EditIcon size={18} />
            {t("pets.editShort")}
          </Link>
        </Card>

        <div className="grid gap-3.5 desktop:grid-cols-2 desktop:items-start desktop:gap-6">
          <ProfileTargetCard pet={pet} />
          <WeighInsCard pet={pet} />
        </div>

        {pet.targets.length > 0 && <TargetHistoryCard pet={pet} />}

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
        onConfirm={() => archive.mutate(pet.id, { onSuccess: () => void navigate("/pets") })}
      />

      <AgePrompt petId={pet.id} petName={pet.name} />
    </div>
  );
}
