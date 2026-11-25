import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { button } from "../forms/button.js";

/**
 * A form page's Save: in a bar stuck to the bottom on a phone, and beside
 * Cancel at the end of the page on desktop.
 */
export function FormActions({
  saveLabel,
  pending,
  onSave,
  cancelTo,
  start,
}: {
  saveLabel: string;
  pending: boolean;
  onSave: () => void;
  cancelTo: string;
  /** On desktop, at the far end from Save, such as Archive. */
  start?: ReactNode;
}) {
  const { t } = useTranslation();
  const save = (className: string) => (
    <button type="button" className={className} disabled={pending} onClick={onSave}>
      {saveLabel}
    </button>
  );

  return (
    <>
      <div className="sticky bottom-0 border-t border-border bg-card px-5 pt-3 pb-[calc(24px+env(safe-area-inset-bottom))] desktop:hidden">
        {save(button.primaryLarge)}
      </div>
      <div className="hidden items-center justify-end gap-2.5 desktop:flex">
        {start && <span className="mr-auto">{start}</span>}
        <Link to={cancelTo} className={button.outline}>
          {t("action.cancel")}
        </Link>
        {save(button.primary)}
      </div>
    </>
  );
}
