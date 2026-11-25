import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ArchivedList } from "../components/ArchivedList.js";
import { PetAvatar } from "./PetAvatar.js";
import { SubPageHeader } from "../components/ui/layout/PageHeader.js";
import { formatDay } from "../lib/format.js";
import { petTypeLabel, useArchivedPets, usePets, useSetArchived } from "./pets.js";

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

      <ArchivedList
        hint={t("pets.archivedHint")}
        items={archived.map((pet) => ({
          id: pet.id,
          name: pet.name,
          leading: (
            <>
              <span className="desktop:hidden">
                <PetAvatar photoId={pet.photoId} size={44} archived />
              </span>
              <span className="hidden desktop:block">
                <PetAvatar photoId={pet.photoId} size={48} archived />
              </span>
            </>
          ),
          detail: t("pets.archivedRow", {
            type: petTypeLabel(pet.type, t),
            date: pet.archivedAt
              ? formatDay(new Date(pet.archivedAt), pets.today, i18n.language)
              : "",
          }),
        }))}
        restoring={restore.isPending}
        onRestore={(id) =>
          restore.mutate(id, {
            // Nothing left to restore: back to the list the pet returned to.
            onSuccess: () => {
              if (archived.length === 1) {
                void navigate("/pets");
              }
            },
          })
        }
      />
    </div>
  );
}
