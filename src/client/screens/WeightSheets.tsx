import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { useDaySettings } from "../lib/feeds.js";
import { formatDay, formatReadingKg } from "../lib/format.js";
import { usePet, type PetDetail } from "../lib/pets.js";
import { useDeleteWeight, useRestoreWeight, type TargetPrompt } from "../lib/weights.js";
import { LogWeightSheet } from "./LogWeightSheet.js";
import { TargetPromptDialog } from "./TargetPromptDialog.js";
import { WeighInActionsSheet } from "./WeighInActionsSheet.js";

type Reading = PetDetail["weights"][number];

type Opened = { sheet: "log" } | { sheet: "edit" | "actions"; reading: Reading };

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
        daySettings={settings}
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
      <WeighInActionsSheet
        petName={pet.name}
        day={day(reading)}
        weight={kg(reading)}
        onEdit={() => setOpened({ sheet: "edit", reading })}
        onDelete={() => {
          close();
          remove(reading);
        }}
        onClose={close}
      />
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
