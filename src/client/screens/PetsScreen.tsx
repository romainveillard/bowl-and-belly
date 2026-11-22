import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { PlusIcon } from "../components/icons.js";
import { PetAvatar } from "../components/PetAvatar.js";
import { TargetProgress } from "../components/TargetProgress.js";
import { button } from "../components/ui/button.js";
import { formatAge, formatKg, petTypeLabel } from "../lib/format.js";
import { usePets } from "../lib/pets.js";
import { PetProfile } from "./PetProfile.js";

/**
 * The Pets tab. A phone shows the list, then a profile as its own page;
 * desktop shows both side by side, with the first pet selected by default.
 */
export function PetsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const params = useParams();
  const { data } = usePets();

  if (!data) {
    return null;
  }

  const openId = params.petId === undefined ? undefined : Number(params.petId);
  const selectedId = openId ?? data.pets[0]?.id;

  return (
    <div className="flex flex-col desktop:gap-6">
      <header className={`px-5 pt-5 pb-3 desktop:block desktop:p-0 ${openId ? "hidden" : ""}`}>
        <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
          {t("nav.pets")}
        </h1>
      </header>

      <div className="desktop:grid desktop:grid-cols-[340px_minmax(0,1fr)] desktop:items-start desktop:gap-6">
        <div
          className={`flex-col gap-3 px-5 pt-1 pb-24 desktop:flex desktop:p-0 ${openId ? "hidden" : "flex"}`}
        >
          {data.pets.map((pet) => {
            const selected = pet.id === selectedId;
            const typeAndAge = `${petTypeLabel(pet.type, t)} · ${formatAge(pet, data.today, t)}`;
            const weight = pet.weightG === null ? null : formatKg(pet.weightG, locale);

            return (
              <Link
                key={pet.id}
                to={`/pets/${pet.id}`}
                aria-current={selected ? "true" : undefined}
                className="flex flex-col gap-3.5 rounded-xl bg-card p-4 inset-ring inset-ring-border desktop:gap-3 desktop:rounded-[14px] desktop:aria-[current]:bg-accent-soft desktop:aria-[current]:inset-ring-2 desktop:aria-[current]:inset-ring-primary-strong"
              >
                <span className="flex items-center gap-3">
                  <span className="desktop:hidden">
                    <PetAvatar photoId={pet.photoId} size={52} />
                  </span>
                  <span className="hidden desktop:block">
                    <PetAvatar photoId={pet.photoId} size={48} onAccent={selected} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-heading font-semibold desktop:text-base">
                      {pet.name}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {typeAndAge}
                      {weight && (
                        <span className="hidden desktop:inline">
                          {" "}
                          · {t("weight.reading", { weight })}
                        </span>
                      )}
                    </span>
                  </span>
                  {weight && (
                    <span className="flex flex-col items-end gap-0.5 tabular-nums desktop:hidden">
                      <span className="font-display text-xl font-semibold">{weight}</span>
                      <span className="text-caption text-muted-foreground">{t("weight.kg")}</span>
                    </span>
                  )}
                </span>
                <TargetProgress
                  eatenKcal={pet.todayKcal}
                  targetKcal={pet.targetKcal}
                  onAccent={selected}
                />
              </Link>
            );
          })}
        </div>

        {selectedId !== undefined && (
          <div className={openId ? "" : "hidden desktop:block"}>
            <PetProfile key={selectedId} petId={selectedId} />
          </div>
        )}
      </div>

      <Link
        to="/pets/new"
        className={`${button.floating} fixed right-5 bottom-[calc(86px+env(safe-area-inset-bottom))] desktop:right-8 desktop:bottom-8 desktop:flex ${openId ? "hidden" : ""}`}
      >
        <PlusIcon size={20} />
        {t("pets.add")}
      </Link>
    </div>
  );
}
