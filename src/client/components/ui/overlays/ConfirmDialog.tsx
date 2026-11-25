import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, dialogButton } from "./Dialog.js";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}

/** Asks before an action the user might regret. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      actions={
        <>
          <AlertDialog.Action onClick={onConfirm} className={dialogButton.danger}>
            {confirmLabel}
          </AlertDialog.Action>
          <AlertDialog.Cancel className={dialogButton.secondary}>
            {t("action.cancel")}
          </AlertDialog.Cancel>
        </>
      }
    />
  );
}
