import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { BackIcon, PetsIcon } from "../components/icons.js";
import { button } from "../components/ui/forms/button.js";
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
      <header className="flex items-center gap-2 px-3 pt-3.5 pb-2.5 desktop:hidden">
        <Link to="/pets" aria-label={t("pets.back")} className={button.icon}>
          <BackIcon />
        </Link>
        <h1 className="font-display text-[26px] font-semibold">{t("pets.archivedTitle")}</h1>
      </header>
      <header className="hidden flex-col gap-1 desktop:flex">
        <Link to="/pets" className="inline-flex items-center gap-1 text-sm font-semibold">
          <BackIcon size={16} />
          {t("nav.pets")}
        </Link>
        <h1 className="font-display text-[34px] leading-10 font-semibold tracking-[-0.5px]">
          {t("pets.archivedTitle")}
        </h1>
        <span className="text-[15px] text-muted-foreground">{t("pets.archivedHint")}</span>
      </header>

      <div className="flex flex-col gap-3 px-5 pt-1 desktop:p-0">
        <p className="text-sm text-muted-foreground desktop:hidden">{t("pets.archivedHint")}</p>
        <div className="overflow-hidden rounded-xl bg-card inset-ring inset-ring-border desktop:max-w-[720px] desktop:rounded-[14px]">
          {archived.map((pet) => (
            <div
              key={pet.id}
              className="flex min-h-[68px] items-center gap-3 border-t border-border py-2.5 pr-3 pl-4 first:border-t-0 desktop:min-h-[72px] desktop:gap-3.5 desktop:px-[22px] desktop:py-3"
            >
              {pet.photoId === null ? (
                <span
                  aria-hidden="true"
                  className="flex size-11 flex-none items-center justify-center rounded-full bg-muted text-primary-strong desktop:size-12"
                >
                  <PetsIcon />
                </span>
              ) : (
                <img
                  src={`/api/images/${pet.photoId}`}
                  alt=""
                  className="size-11 flex-none rounded-full object-cover desktop:size-12"
                />
              )}
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
