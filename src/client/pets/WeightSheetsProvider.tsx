import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "../components/icons.js";
import { useSnackbar } from "../components/ui/feedback/Snackbar.js";
import { button } from "../components/ui/forms/button.js";
import { formatDay, formatReadingKg } from "../lib/format.js";
import { LogWeightSheet } from "./LogWeightSheet.js";
import { usePet, type PetDetail } from "./pets.js";
import { TargetPromptDialog } from "./TargetPromptDialog.js";
import { WeighInActionsSheet } from "./WeighInActionsSheet.js";
import { useDeleteWeight, useRestoreWeight, type TargetPrompt } from "./weights.js";
import { useSettings } from "../settings/settings.js";

type Reading = PetDetail["weights"][number];

interface WeightSheets {
  openLog: () => void;
  openActions: (reading: Reading) => void;
  edit: (reading: Reading) => void;
  remove: (reading: Reading) => void;
}

const WeightSheetsContext = createContext<WeightSheets | null>(null);

type Opened = { sheet: "log" } | { sheet: "edit" | "actions"; reading: Reading };

/**
 * Logging, correcting and deleting a pet's weigh-ins for the components
 * inside, and the target question that a change to the latest one can raise.
 */
export function WeightSheetsProvider({
  petId,
  children,
}: {
  petId: number | undefined;
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const { data: pet } = usePet(petId);
  const { data: settings } = useSettings();
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

  let sheet: ReactNode = null;
  if (pet && settings && (opened?.sheet === "log" || opened?.sheet === "edit")) {
    sheet = (
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
    sheet = (
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

  return (
    <WeightSheetsContext
      value={{
        openLog: () => setOpened({ sheet: "log" }),
        openActions: (reading) => setOpened({ sheet: "actions", reading }),
        edit: (reading) => setOpened({ sheet: "edit", reading }),
        remove,
      }}
    >
      {children}
      {sheet}
      {pet && prompt && (
        <TargetPromptDialog
          petId={pet.id}
          petName={pet.name}
          prompt={prompt}
          onClose={() => setPrompt(null)}
        />
      )}
    </WeightSheetsContext>
  );
}

export function useWeightSheets(): WeightSheets {
  const sheets = useContext(WeightSheetsContext);
  if (!sheets) {
    throw new Error("useWeightSheets is only for components inside a WeightSheetsProvider");
  }
  return sheets;
}

/** The floating "Log weight" button beside a tab's main action, on desktop. */
export function LogWeightButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { openLog } = useWeightSheets();

  return (
    <button type="button" className={`${button.floatingSecondary} ${className}`} onClick={openLog}>
      <PlusIcon size={18} />
      {t("logWeight.button")}
    </button>
  );
}
