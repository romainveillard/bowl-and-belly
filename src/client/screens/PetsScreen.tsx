import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ChevronRightIcon, PetsIcon, PlusIcon } from "../components/icons.js";
import { PetAvatar } from "../components/PetAvatar.js";
import { TargetProgress } from "../components/TargetProgress.js";
import { button } from "../components/ui/forms/button.js";
import { formatAge, formatKg, petTypeLabel } from "../lib/format.js";
import { usePets } from "../lib/pets.js";
import { PetProfile } from "./PetProfile.js";
import { useWeightSheets } from "./WeightSheets.js";

/**
 * The Pets tab. A phone shows the list, then a profile as its own page;
 * desktop shows both side by side, with the first pet selected by default.
 */
export function PetsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const params = useParams();
  const { data } = usePets();
  const openId = params.petId === undefined ? undefined : Number(params.petId);
  const selectedId = openId ?? data?.pets[0]?.id;
  const weightSheets = useWeightSheets(selectedId);

  if (!data) {
    return null;
  }

  const archivedLink = data.archivedCount > 0 && (
    <Link
      to="/pets/archived"
      className="flex min-h-11 items-center justify-between px-1 text-sm text-muted-foreground"
    >
      {t("pets.archivedLink", { count: data.archivedCount })}
      <ChevronRightIcon size={18} />
    </Link>
  );

  if (data.pets.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-68px-env(safe-area-inset-bottom))] flex-col desktop:min-h-0 desktop:gap-6">
        <header className="px-5 pt-5 pb-3 desktop:p-0">
          <h1 className="font-display text-display font-semibold desktop:text-[34px] desktop:leading-10">
            {t("nav.pets")}
          </h1>
        </header>
        <section className="flex flex-1 flex-col items-center justify-center gap-3.5 px-8 pb-10 text-center desktop:flex-none desktop:rounded-[14px] desktop:bg-card desktop:px-8 desktop:py-20 desktop:inset-ring desktop:inset-ring-border">
          <span
            aria-hidden="true"
            className="flex size-24 flex-none items-center justify-center rounded-full bg-accent-soft text-primary-strong desktop:size-28"
          >
            <PetsIcon size={48} />
          </span>
          <h2 className="mt-2 font-display text-2xl font-semibold desktop:text-[28px]">
            {t("pets.emptyTitle")}
          </h2>
          <p className="max-w-[300px] text-[15px] leading-[22px] text-muted-foreground desktop:max-w-[420px] desktop:text-base desktop:leading-6">
            {t("pets.emptyBody")}
          </p>
          <Link
            to="/pets/new"
            className={`${button.floating} mt-2 h-[52px] shadow-none desktop:px-[26px]`}
          >
            <PlusIcon size={20} />
            {t("pets.add")}
          </Link>
        </section>
        <div className="px-5 desktop:p-0">{archivedLink}</div>
      </div>
    );
  }

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
          {archivedLink}
        </div>

        {selectedId !== undefined && (
          <div className={openId ? "" : "hidden desktop:block"}>
            <PetProfile key={selectedId} petId={selectedId} weightSheets={weightSheets} />
          </div>
        )}
      </div>

      <div
        className={`fixed right-5 bottom-[calc(86px+env(safe-area-inset-bottom))] flex items-center gap-2.5 desktop:right-8 desktop:bottom-8 desktop:flex ${openId ? "hidden" : ""}`}
      >
        {selectedId !== undefined && (
          <button
            type="button"
            className={`${button.floatingSecondary} hidden desktop:inline-flex`}
            onClick={weightSheets.openLog}
          >
            <PlusIcon size={18} />
            {t("logWeight.button")}
          </button>
        )}
        <Link to="/pets/new" className={button.floating}>
          <PlusIcon size={20} />
          {t("pets.add")}
        </Link>
      </div>
      {weightSheets.ui}
    </div>
  );
}
