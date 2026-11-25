import { ActionRow } from "../components/ui/overlays/ActionRow.js";
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
      <ActionRow
        icon={<EditIcon size={18} />}
        label={t("feed.edit")}
        hint={t("feed.editHint")}
        onClick={onEdit}
      />
      <ActionRow
        icon={<BowlIcon size={18} />}
        label={t("feed.addLeftover")}
        hint={t("feed.addLeftoverHint")}
        onClick={onAddLeftover}
      />
      <ActionRow
        icon={<RepeatIcon size={18} />}
        label={t("feed.logAgain")}
        hint={t("feed.logAgainHint")}
        onClick={act(onLogAgain)}
      />
      <ActionRow
        icon={<TrashIcon size={18} />}
        label={t("feed.delete")}
        hint={t("feed.deleteHint")}
        danger
        onClick={act(onDelete)}
      />
    </Sheet>
  );
}
