import { useTranslation } from "react-i18next";
import { EditIcon, TrashIcon } from "../components/icons.js";
import { ActionRow } from "../components/ui/overlays/ActionRow.js";
import { Sheet } from "../components/ui/overlays/Sheet.js";

interface WeighInActionsSheetProps {
  petName: string;
  /** The reading's date and weight, as shown in its row. */
  day: string;
  weight: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** What can be done with one weigh-in, opened by tapping it on the profile. */
export function WeighInActionsSheet({
  petName,
  day,
  weight,
  onEdit,
  onDelete,
  onClose,
}: WeighInActionsSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet
      open
      flush
      onOpenChange={(open) => !open && onClose()}
      title={t("weighIn.title")}
      subtitle={t("weighIn.subtitle", { name: petName, date: day, weight })}
    >
      <ActionRow
        icon={<EditIcon size={18} />}
        label={t("weighIn.edit")}
        hint={t("weighIn.editHint")}
        onClick={onEdit}
      />
      <ActionRow
        icon={<TrashIcon size={18} />}
        label={t("weighIn.delete")}
        hint={t("weighIn.deleteHint")}
        danger
        onClick={onDelete}
      />
    </Sheet>
  );
}
