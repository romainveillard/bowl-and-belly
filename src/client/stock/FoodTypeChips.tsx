import { useTranslation } from "react-i18next";
import { foodTypeLabel } from "./foods.js";
import { Chip } from "../components/ui/forms/Chip.js";

interface FoodTypeChipsProps {
  types: { id: number; systemKey: "wet" | "dry" | null; name: string | null }[];
  /** The chosen type, or null for all of them. */
  selected: number | null;
  onSelect: (typeId: number | null) => void;
  /** Lets the chips run onto a second line rather than scroll. */
  wrap?: boolean;
}

/** "All" and a chip per food type, to filter a list of foods. */
export function FoodTypeChips({ types, selected, onSelect, wrap = false }: FoodTypeChipsProps) {
  const { t } = useTranslation();
  const chip = wrap ? "" : "flex-none";

  return (
    <div className={`flex gap-2 ${wrap ? "flex-wrap" : ""}`}>
      <Chip pressed={selected === null} onClick={() => onSelect(null)} className={chip}>
        {t("stock.all")}
      </Chip>
      {types.map((type) => (
        <Chip
          key={type.id}
          pressed={selected === type.id}
          onClick={() => onSelect(type.id)}
          className={chip}
        >
          {foodTypeLabel(type, t)}
        </Chip>
      ))}
    </div>
  );
}
