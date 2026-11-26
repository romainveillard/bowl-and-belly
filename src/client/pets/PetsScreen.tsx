import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { ArchivedLink } from "../components/ArchivedLink.js";
import { EmptyState } from "../components/EmptyState.js";
import {
  ChevronRightIcon,
  HistoryIcon,
  PetsIcon,
  PlusIcon,
  SettingsIcon,
} from "../components/icons.js";
import { List } from "../components/ui/layout/List.js";
import { PetAvatar } from "./PetAvatar.js";
import { TargetProgress } from "./TargetProgress.js";
import { button } from "../components/ui/forms/button.js";
import { FloatingActions } from "../components/ui/layout/FloatingActions.js";
import { PageHeader } from "../components/ui/layout/PageHeader.js";
import { formatAge, formatKg } from "../lib/format.js";
import { petTypeLabel, usePets } from "./pets.js";
import { PetProfile } from "./PetProfile.js";
import { useSelectedPet } from "./selectedPet.js";
import { LogWeightButton, WeightSheetsProvider } from "./WeightSheetsProvider.js";

/**
 * The Pets tab. A phone shows the list, then a profile as its own page;
 * desktop shows both side by side, with the first pet selected by default.
 */
/**
 * Archived pets and Settings, under the pets on a phone. It is the one way to
 * Settings there that never goes away: the pet chip only opens the switcher,
 * where Settings also is, with two pets or more.
 */
function MoreLinks({ archivedCount }: { archivedCount: number }) {
  const { t } = useTranslation();
  const links = [
    ...(archivedCount > 0
      ? [
          {
            to: "/pets/archived",
            label: t("pets.archivedLink", { count: archivedCount }),
            icon: <HistoryIcon size={20} />,
          },
        ]
      : []),
    { to: "/settings", label: t("nav.settings"), icon: <SettingsIcon size={20} /> },
  ];

  return (
    <nav aria-label={t("pets.more")} className="desktop:hidden">
      <List className="divide-y divide-border">
        {links.map(({ to, label, icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-h-[52px] items-center justify-between gap-3 px-4 text-[15px]"
          >
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="flex text-muted-foreground">
                {icon}
              </span>
              {label}
            </span>
            <span aria-hidden="true" className="flex text-muted-foreground">
              <ChevronRightIcon size={18} />
            </span>
          </Link>
        ))}
      </List>
    </nav>
  );
}

export function PetsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const params = useParams();
  const { data } = usePets();
  const { pet: selectedPet, select } = useSelectedPet();
  const openId = params.petId === undefined ? undefined : Number(params.petId);
  // The pet followed across screens, unless the address names another.
  const selectedId = openId ?? selectedPet?.id;
  const openIsActive = data?.pets.some((pet) => pet.id === openId) ?? false;

  // Opening a pet here makes it the one the other screens follow.
  useEffect(() => {
    if (openId !== undefined && openIsActive) {
      select(openId);
    }
  }, [openId, openIsActive, select]);

  if (!data) {
    return null;
  }

  const footer = (
    <>
      <MoreLinks archivedCount={data.archivedCount} />
      {data.archivedCount > 0 && (
        <div className="hidden desktop:block">
          <ArchivedLink
            to="/pets/archived"
            label={t("pets.archivedLink", { count: data.archivedCount })}
          />
        </div>
      )}
    </>
  );

  if (data.pets.length === 0) {
    return (
      <EmptyState
        size="large"
        heading={t("nav.pets")}
        icon={<PetsIcon size={48} />}
        title={t("pets.emptyTitle")}
        body={t("pets.emptyBody")}
        action={{ label: t("pets.add"), to: "/pets/new" }}
        footer={footer}
      />
    );
  }

  return (
    <WeightSheetsProvider petId={selectedId}>
      <div className="flex flex-col desktop:gap-6">
        {/* A phone shows an open pet's profile in the list's place, with a way back instead. */}
        <div className={openId ? "hidden desktop:block" : ""}>
          <PageHeader title={t("nav.pets")} />
        </div>

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
                    <PetAvatar
                      photoId={pet.photoId}
                      size="size-13 desktop:size-12"
                      onAccent={selected && "desktop"}
                    />
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
                        <span className="text-caption text-muted-foreground">{t("common.kg")}</span>
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
            {footer}
          </div>

          {selectedId !== undefined && (
            <div className={openId ? "" : "hidden desktop:block"}>
              <PetProfile key={selectedId} petId={selectedId} opened={openId !== undefined} />
            </div>
          )}
        </div>

        <FloatingActions className={`desktop:flex ${openId ? "hidden" : ""}`}>
          {selectedId !== undefined && <LogWeightButton className="hidden desktop:inline-flex" />}
          <Link to="/pets/new" className={button.floating}>
            <PlusIcon size={20} />
            {t("pets.add")}
          </Link>
        </FloatingActions>
      </div>
    </WeightSheetsProvider>
  );
}
