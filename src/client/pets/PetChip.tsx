import { Popover } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { petTypeLabel, usePets, type PetSummary } from "./pets.js";
import { useSelectedPet } from "./selectedPet.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "../components/icons.js";
import { PetAvatar } from "./PetAvatar.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";

const chip =
  "inline-flex h-11 max-w-full flex-none items-center gap-1.5 rounded-full bg-card pr-2.5 pl-1.5 text-sm font-semibold inset-ring inset-ring-border desktop:gap-2 desktop:pr-3 desktop:text-[15px]";

function PetOptions({ onChosen }: { onChosen: () => void }) {
  const { t } = useTranslation();
  const { data } = usePets();
  const { pet: selected, select } = useSelectedPet();

  const detail = (pet: PetSummary) => {
    const type = petTypeLabel(pet.type, t);
    return pet.targetKcal === null
      ? t("petChip.optionNoTarget", { type, eaten: pet.todayKcal })
      : t("petChip.option", { type, eaten: pet.todayKcal, target: pet.targetKcal });
  };

  return (
    <>
      <div role="group" aria-label={t("petChip.pets")} className="flex flex-col gap-1">
        {data?.pets.map((pet) => {
          const isSelected = pet.id === selected?.id;
          return (
            <button
              key={pet.id}
              type="button"
              aria-current={isSelected ? "true" : undefined}
              onClick={() => {
                select(pet.id);
                onChosen();
              }}
              className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left aria-[current]:bg-accent-soft desktop:min-h-14 desktop:rounded-[10px] desktop:px-3 desktop:py-2"
            >
              <PetAvatar
                photoId={pet.photoId}
                size="size-11 desktop:size-10"
                onAccent={isSelected}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-semibold desktop:text-[15px]">
                  {pet.name}
                </span>
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {detail(pet)}
                </span>
              </span>
              {isSelected && (
                <span className="flex text-primary-strong">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Link
        to="/pets"
        onClick={onChosen}
        className="mt-1 flex min-h-12 items-center justify-between border-t border-border px-3.5 text-[15px] font-semibold desktop:min-h-11 desktop:px-3 desktop:text-sm"
      >
        {t("petChip.manage")}
        <ChevronRightIcon size={18} />
      </Link>
    </>
  );
}

/**
 * The pet that pet-specific screens follow. With two or more pets it opens
 * the switcher: a sheet on a phone, a list under the chip on desktop.
 */
export function PetChip() {
  const { t } = useTranslation();
  const { data } = usePets();
  const { pet } = useSelectedPet();
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  if (!pet) {
    return null;
  }
  const face = (
    <>
      <PetAvatar photoId={pet.photoId} size="size-8" />
      <span className="max-w-[110px] truncate desktop:max-w-none">{pet.name}</span>
    </>
  );
  if ((data?.pets.length ?? 0) < 2) {
    return <span className={chip}>{face}</span>;
  }

  const trigger = (onClick?: () => void) => (
    <button
      type="button"
      aria-label={t("petChip.label", { name: pet.name })}
      className={`${chip} cursor-pointer`}
      onClick={onClick}
    >
      {face}
      <span aria-hidden="true" className="flex text-muted-foreground">
        <ChevronDownIcon size={18} />
      </span>
    </button>
  );

  if (isDesktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>{trigger()}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-30 flex w-80 flex-col gap-1 rounded-[14px] bg-card p-2 shadow-[inset_0_0_0_1px_var(--color-border),0_16px_36px_rgba(31,42,68,0.18)]"
          >
            <PetOptions onChosen={() => setOpen(false)} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Sheet open={open} onOpenChange={setOpen} title={t("petChip.switchTitle")} flush>
        <div className="flex flex-col gap-2 px-3">
          <PetOptions onChosen={() => setOpen(false)} />
        </div>
      </Sheet>
    </>
  );
}
