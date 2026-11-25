import { useState } from "react";
import { useTranslation } from "react-i18next";
import { button } from "../components/ui/forms/button.js";
import { Notice } from "../components/ui/feedback/Notice.js";
import { SheetActions } from "../components/ui/overlays/SheetActions.js";
import { ConfirmDialog } from "../components/ui/overlays/ConfirmDialog.js";
import { ErrorSummary } from "../components/ui/forms/ErrorSummary.js";
import { Field } from "../components/ui/forms/Field.js";
import { Segmented } from "../components/ui/forms/Segmented.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import { useFormErrors } from "../lib/useFormErrors.js";
import { useSaveFoodType, useSavePetType, useSetTypeArchived, type TypeKind } from "./types.js";

export interface CustomType {
  id: number;
  name: string;
  leftoverReturnsToStock?: boolean;
}

interface TypeFormSheetProps {
  kind: TypeKind;
  /** The custom type being edited; none to add one. */
  type?: CustomType | undefined;
  /** Every other type's label as shown, built-in ones in the current language. */
  otherLabels: string[];
  onClose: () => void;
}

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function TypeFormSheet({ kind, type, otherLabels, onClose }: TypeFormSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(type?.name ?? "");
  const [returns, setReturns] = useState(type?.leftoverReturnsToStock ?? false);
  // Names the server refused, in case another device added one meanwhile.
  const [refused, setRefused] = useState<string[]>([]);
  const [archiving, setArchiving] = useState(false);
  const saveFood = useSaveFoodType(type?.id);
  const savePet = useSavePetType(type?.id);
  const archive = useSetTypeArchived(kind, "archive");
  const pending = saveFood.isPending || savePet.isPending;

  const problems = new Map<"name", "missing" | "taken">();
  if (name.trim() === "") {
    problems.set("name", "missing");
  } else if ([...otherLabels, ...refused].some((label) => sameName(label, name))) {
    problems.set("name", "taken");
  }
  const errors = useFormErrors(problems, ["name"], "type");
  const problem = errors.problemOf("name");

  const onSaved = (result: "name_taken" | null) => {
    if (result === "name_taken") {
      setRefused((names) => [...names, name]);
    } else {
      onClose();
    }
  };
  const submit = () => {
    if (errors.reject()) {
      return;
    }
    if (kind === "food") {
      saveFood.mutate(
        { name: name.trim(), leftoverReturnsToStock: returns },
        { onSuccess: onSaved },
      );
    } else {
      savePet.mutate(name.trim(), { onSuccess: onSaved });
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={t(`types.${kind}.${type ? "editTitle" : "addTitle"}`)}
      footer={
        <SheetActions
          saveLabel={t(`types.${kind}.save`)}
          pending={pending}
          onSave={submit}
          onCancel={onClose}
        >
          {type && (
            <button
              type="button"
              className={`${button.dangerGhost} desktop:mr-auto`}
              onClick={() => setArchiving(true)}
            >
              {t("types.archive")}
            </button>
          )}
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-4 pt-2 desktop:gap-[18px] desktop:pt-0">
        <ErrorSummary inSheet names={errors.shown.length > 0 ? [t("types.errorName")] : []} />
        <Field
          id={errors.idOf("name")}
          label={t("types.name")}
          value={name}
          onChange={setName}
          onBlur={errors.recheck("name")}
          maxLength={40}
          error={problem && t(`types.errors.${problem}`, { name: name.trim() })}
        />
        {kind === "food" ? (
          <div className="flex flex-col gap-1.5">
            <Segmented
              label={t("types.leftovers")}
              value={returns ? "stock" : "bin"}
              onChange={(value) => setReturns(value === "stock")}
              options={[
                { value: "stock", label: t("types.backInStock") },
                { value: "bin", label: t("types.binned") },
              ]}
            />
            <span className="text-[13px] text-muted-foreground">{t("types.leftoversHint")}</span>
          </div>
        ) : (
          <Notice tone="info">{t("types.pet.noFormula")}</Notice>
        )}
      </div>
      {type && (
        <ConfirmDialog
          open={archiving}
          onOpenChange={setArchiving}
          title={t("types.archiveTitle", { name: type.name })}
          description={t(`types.${kind}.archiveBody`, { name: type.name })}
          confirmLabel={t("types.archiveConfirm")}
          onConfirm={() => archive.mutate(type.id, { onSuccess: onClose })}
        />
      )}
    </Sheet>
  );
}
