import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}

const action =
  "inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-xl text-base font-semibold desktop:h-11 desktop:w-auto desktop:rounded-[10px] desktop:px-[18px] desktop:text-[15px]";

/** Asks before an action the user might regret: centred on a phone, near the top on desktop. */
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
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-10 bg-[rgba(31,42,68,0.45)]" />
        <AlertDialog.Content className="fixed inset-x-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4 rounded-2xl bg-card p-[22px] shadow-[0_12px_32px_rgba(31,42,68,0.25)] desktop:inset-x-auto desktop:top-[140px] desktop:left-1/2 desktop:w-[min(460px,calc(100%-32px))] desktop:-translate-x-1/2 desktop:translate-y-0 desktop:gap-[18px] desktop:p-6 desktop:shadow-[0_20px_48px_rgba(31,42,68,0.3)]">
          <div className="flex flex-col gap-1.5 desktop:gap-2">
            <AlertDialog.Title className="font-display text-title font-semibold desktop:text-2xl">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-[15px] leading-[22px] text-muted-foreground">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex flex-col gap-2 desktop:flex-row-reverse desktop:justify-start desktop:gap-2.5">
            <AlertDialog.Action onClick={onConfirm} className={`${action} bg-danger text-card`}>
              {confirmLabel}
            </AlertDialog.Action>
            <AlertDialog.Cancel className={`${action} border border-border bg-card`}>
              {t("action.cancel")}
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
