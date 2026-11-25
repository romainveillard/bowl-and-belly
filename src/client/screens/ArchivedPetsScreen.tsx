import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { PetAvatar } from "../components/PetAvatar.js";
import { button } from "../components/ui/forms/button.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { formatDay, petTypeLabel } from "../lib/format.js";
import { useArchivedPets, usePets, useSetArchived } from "../lib/pets.js";

export function ArchivedPetsScreen() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: pets } = usePets();
  const { data: archived } = useArchivedPets();
  const restore = useSetArchived("restore");

  if (!pets || !archived) {
    return null;
  }

  return (
    <div className="flex flex-col desktop:gap-6">
      <SubPageHeader
        title={t("pets.archivedTitle")}
        hint={t("pets.archivedHint")}
        phoneLink={{ to: "/pets", label: t("pets.back") }}
        desktopLink={{ to: "/pets", label: t("nav.pets") }}
      />

      <div className="flex flex-col gap-3 px-5 pt-1 desktop:p-0">
        <p className="text-sm text-muted-foreground desktop:hidden">{t("pets.archivedHint")}</p>
        <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:max-w-[720px] desktop:rounded-[14px]">
          {archived.map((pet) => (
            <div
              key={pet.id}
              className="flex min-h-[68px] items-center gap-3 border-t border-border py-2.5 pr-3 pl-4 first:border-t-0 desktop:min-h-[72px] desktop:gap-3.5 desktop:px-[22px] desktop:py-3"
            >
              <span className="desktop:hidden">
                <PetAvatar photoId={pet.photoId} size={44} archived />
              </span>
              <span className="hidden desktop:block">
                <PetAvatar photoId={pet.photoId} size={48} archived />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-semibold">{pet.name}</span>
                <span className="text-[13px] text-muted-foreground">
                  {t("pets.archivedRow", {
                    type: petTypeLabel(pet.type, t),
                    date: pet.archivedAt
                      ? formatDay(new Date(pet.archivedAt), pets.today, i18n.language)
                      : "",
                  })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t("pets.restoreNamed", { name: pet.name })}
                className={`${button.outline} flex-none`}
                disabled={restore.isPending}
                onClick={() =>
                  restore.mutate(pet.id, {
                    // Nothing left to restore: back to the list the pet returned to.
                    onSuccess: () => archived.length === 1 && navigate("/pets"),
                  })
                }
              >
                {t("pets.restore")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
