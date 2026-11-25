import { useTranslation } from "react-i18next";
import { foodTypeLabel } from "../lib/foods.js";
import { BowlIcon, DryFoodIcon, WetFoodIcon } from "./icons.js";
import { Badge } from "./ui/feedback/Badge.js";

interface FoodType {
  systemKey: "wet" | "dry" | null;
  name: string | null;
}

const colours = {
  wet: "bg-wet text-wet-foreground",
  dry: "bg-dry text-dry-foreground",
  custom: "bg-muted text-muted-foreground",
};

/** The square tile that starts a food row: a blue drop for wet, peach kibbles for dry. */
export function FoodTypeTile({ type }: { type: FoodType }) {
  const { t } = useTranslation();
  const label = foodTypeLabel(type, t);

  return (
    <span
      role="img"
      aria-label={label}
      className={`flex size-10 flex-none items-center justify-center rounded-[10px] ${colours[type.systemKey ?? "custom"]}`}
    >
      {type.systemKey === "wet" && <WetFoodIcon size={20} />}
      {type.systemKey === "dry" && <DryFoodIcon size={20} />}
      {type.systemKey === null && <BowlIcon size={20} />}
    </span>
  );
}

export function FoodTypeBadge({ type }: { type: FoodType }) {
  const { t } = useTranslation();

  return <Badge tone={type.systemKey ?? "neutral"}>{foodTypeLabel(type, t)}</Badge>;
}
