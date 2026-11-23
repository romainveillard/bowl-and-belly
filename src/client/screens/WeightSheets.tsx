import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EditIcon, TrashIcon } from "../components/icons.js";
import { Sheet } from "../components/ui/Sheet.js";
import { useSnackbar } from "../components/ui/Snackbar.js";
import { useDaySettings } from "../lib/feeds.js";
import { formatDay, formatReadingKg } from "../lib/format.js";
import { usePet, type PetDetail } from "../lib/pets.js";
import { useDeleteWeight, useRestoreWeight, type TargetPrompt } from "../lib/weights.js";
import { LogWeightSheet } from "./LogWeightSheet.js";
import { TargetPromptDialog } from "./TargetPromptDialog.js";

type Reading = PetDetail["weights"][number];

type Opened = { sheet: "log" } | { sheet: "edit" | "actions"; reading: Reading };

function Action({
  icon,
  label,
  hint,
  danger = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full cursor-pointer items-center gap-3.5 border-t border-border px-5 py-2 text-left first:border-t-0 desktop:px-6 ${danger ? "text-danger" : ""}`}
    >
      <span
        className={`flex size-9 flex-none items-center justify-center rounded-full ${danger ? "bg-danger-soft" : "bg-muted"}`}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{label}</span>
        <span className="text-[13px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

/**
 * Logging, correcting and deleting a pet's weigh-ins, and the target
 * question that a change to the latest one can raise.
 */
export function useWeightSheets(petId: number | undefined) {
  const { t, i18n } = useTranslation();
  const { data: pet } = usePet(petId);
  const { data: settings } = useDaySettings();
  const deleteWeight = useDeleteWeight();
  const restoreWeight = useRestoreWeight();
  const showSnackbar = useSnackbar();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [prompt, setPrompt] = useState<TargetPrompt | null>(null);
  const close = () => setOpened(null);

  const day = (reading: Reading) =>
    formatDay(new Date(reading.measuredAt), pet?.today ?? "", i18n.language);
  const kg = (reading: Reading) => formatReadingKg(reading.weightG, i18n.language);

  const remove = (reading: Reading) =>
    deleteWeight.mutate(reading.id, {
      onSuccess: ({ deleted, prompt: next }) => {
        showSnackbar({
          message: t("weighIn.deleted"),
          detail: t("weighIn.deletedDetail", { date: day(reading), weight: kg(reading) }),
          action: { label: t("feed.undo"), onClick: () => restoreWeight.mutate(deleted) },
        });
        setPrompt(next);
      },
    });

  let ui: ReactNode = null;
  if (pet && settings && (opened?.sheet === "log" || opened?.sheet === "edit")) {
    ui = (
      <LogWeightSheet
        pet={pet}
        timeZone={settings.timeZone}
        editing={opened.sheet === "edit" ? opened.reading : undefined}
        onSaved={(next) => {
          close();
          setPrompt(next);
        }}
        onClose={close}
      />
    );
  } else if (pet && opened?.sheet === "actions") {
    const { reading } = opened;
    ui = (
      <Sheet
        open
        flush
        onOpenChange={(open) => !open && close()}
        title={t("weighIn.title")}
        subtitle={t("weighIn.subtitle", {
          name: pet.name,
          date: day(reading),
          weight: kg(reading),
        })}
      >
        <Action
          icon={<EditIcon size={18} />}
          label={t("weighIn.edit")}
          hint={t("weighIn.editHint")}
          onClick={() => setOpened({ sheet: "edit", reading })}
        />
        <Action
          icon={<TrashIcon size={18} />}
          label={t("weighIn.delete")}
          hint={t("weighIn.deleteHint")}
          danger
          onClick={() => {
            close();
            remove(reading);
          }}
        />
      </Sheet>
    );
  }

  return {
    openLog: () => setOpened({ sheet: "log" }),
    openActions: (reading: Reading) => setOpened({ sheet: "actions", reading }),
    edit: (reading: Reading) => setOpened({ sheet: "edit", reading }),
    remove,
    ui: (
      <>
        {ui}
        {pet && prompt && (
          <TargetPromptDialog
            petId={pet.id}
            petName={pet.name}
            prompt={prompt}
            onClose={() => setPrompt(null)}
          />
        )}
      </>
    ),
  };
}
