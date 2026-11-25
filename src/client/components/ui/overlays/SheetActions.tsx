import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { button } from "../forms/button.js";

/** A form sheet's footer: Save, and Cancel on desktop, where there is no swipe to close. */
export function SheetActions({
  saveLabel,
  pending,
  onSave,
  onCancel,
  children,
}: {
  saveLabel: string;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
  /** More actions after Cancel, such as Archive. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <>
      <button type="button" className={button.sheetPrimary} disabled={pending} onClick={onSave}>
        {saveLabel}
      </button>
      <button type="button" className={button.sheetCancel} onClick={onCancel}>
        {t("action.cancel")}
      </button>
      {children}
    </>
  );
}
