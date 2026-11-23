import { Dialog, Popover } from "radix-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { petTypeLabel } from "../lib/format.js";
import { usePets, type PetSummary } from "../lib/pets.js";
import { useSelectedPet } from "../lib/selectedPet.js";
import { useIsDesktop } from "../lib/useIsDesktop.js";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "./icons.js";
import { PetAvatar } from "./PetAvatar.js";

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
      <div role="listbox" aria-label={t("petChip.pets")} className="flex flex-col gap-1">
        {data?.pets.map((pet) => {
          const isSelected = pet.id === selected?.id;
          return (
            <button
              key={pet.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                select(pet.id);
                onChosen();
              }}
              className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-left aria-selected:bg-accent-soft desktop:min-h-14 desktop:rounded-[10px] desktop:px-3 desktop:py-2"
            >
              <span className="desktop:hidden">
                <PetAvatar photoId={pet.photoId} size={44} onAccent={isSelected} />
              </span>
              <span className="hidden desktop:block">
                <PetAvatar photoId={pet.photoId} size={40} onAccent={isSelected} />
              </span>
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
      <PetAvatar photoId={pet.photoId} size={32} />
      <span className="max-w-[110px] truncate desktop:max-w-none">{pet.name}</span>
    </>
  );
  if ((data?.pets.length ?? 0) < 2) {
    return <span className={chip}>{face}</span>;
  }

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-label={t("petChip.label", { name: pet.name })}
      className={`${chip} cursor-pointer`}
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
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-10 bg-[rgba(31,42,68,0.45)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 rounded-t-3xl bg-card px-3 pt-2.5 pb-[calc(24px+env(safe-area-inset-bottom))]"
        >
          <div aria-hidden="true" className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-border" />
          <Dialog.Title className="mx-2 mb-1 font-display text-title font-semibold">
            {t("petChip.switchTitle")}
          </Dialog.Title>
          <PetOptions onChosen={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
