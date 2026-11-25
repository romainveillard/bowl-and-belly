import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BowlIcon, EditIcon, RepeatIcon, TrashIcon } from "../components/icons.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";
import type { FeedEntry } from "../lib/feeds.js";
import { formatTime } from "../lib/format.js";
import { formatDay } from "../lib/format.js";

interface FeedActionsSheetProps {
  entry: FeedEntry;
  day: string;
  today: string;
  timeZone: string;
  onEdit: () => void;
  onAddLeftover: () => void;
  onLogAgain: () => void;
  onDelete: () => void;
  onClose: () => void;
}

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

/** What can be done with one feed, opened by tapping its row. */
export function FeedActionsSheet({
  entry,
  day,
  today,
  timeZone,
  onEdit,
  onAddLeftover,
  onLogAgain,
  onDelete,
  onClose,
}: FeedActionsSheetProps) {
  const { t, i18n } = useTranslation();
  const act = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <Sheet
      open
      flush
      onOpenChange={(open) => !open && onClose()}
      title={entry.food.name}
      subtitle={t("feed.actionsSubtitle", {
        day: day === today ? t("feed.today") : formatDay(day, today, i18n.language),
        time: formatTime(entry.fedAt, timeZone, i18n.language),
        served: entry.servedG,
        kcal: entry.kcal,
      })}
    >
      <Action
        icon={<EditIcon size={18} />}
        label={t("feed.edit")}
        hint={t("feed.editHint")}
        onClick={onEdit}
      />
      <Action
        icon={<BowlIcon size={18} />}
        label={t("feed.addLeftover")}
        hint={t("feed.addLeftoverHint")}
        onClick={onAddLeftover}
      />
      <Action
        icon={<RepeatIcon size={18} />}
        label={t("feed.logAgain")}
        hint={t("feed.logAgainHint")}
        onClick={act(onLogAgain)}
      />
      <Action
        icon={<TrashIcon size={18} />}
        label={t("feed.delete")}
        hint={t("feed.deleteHint")}
        danger
        onClick={act(onDelete)}
      />
    </Sheet>
  );
}
