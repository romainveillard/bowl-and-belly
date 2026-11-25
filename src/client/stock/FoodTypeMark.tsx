import { useTranslation } from "react-i18next";
import { foodTypeLabel } from "./foods.js";
import { BowlIcon, DryFoodIcon, WetFoodIcon } from "../components/icons.js";
import { Badge } from "../components/ui/feedback/Badge.js";

interface FoodType {
  systemKey: "wet" | "dry" | null;
  name: string | null;
}

const colours = {
  wet: "bg-wet text-wet-foreground",
  dry: "bg-dry text-dry-foreground",
  custom: "bg-muted text-muted-foreground",
};

/** A food type's drawing: a drop for wet, kibbles for dry, a bowl for the user's own types. */
export function FoodTypeIcon({ type, size }: { type: FoodType; size: number }) {
  if (type.systemKey === "wet") {
    return <WetFoodIcon size={size} />;
  }
  return type.systemKey === "dry" ? <DryFoodIcon size={size} /> : <BowlIcon size={size} />;
}

const iconColours = {
  wet: "text-wet-foreground",
  dry: "text-dry-foreground",
  custom: "text-muted-foreground",
};

/** The icon in the type's own colour, beside text that names it, such as on a filter chip. */
export function FoodTypeGlyph({ type }: { type: FoodType }) {
  return (
    <span className={`flex ${iconColours[type.systemKey ?? "custom"]}`}>
      <FoodTypeIcon type={type} size={16} />
    </span>
  );
}

/**
 * The square tile that starts a food row: a blue drop for wet, peach kibbles for dry.
 * Decorative where text beside it already names the type, which would otherwise be read twice.
 */
export function FoodTypeTile({
  type,
  decorative = false,
}: {
  type: FoodType;
  decorative?: boolean;
}) {
  const { t } = useTranslation();
  const name = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": foodTypeLabel(type, t) } as const);

  return (
    <span
      {...name}
      className={`flex size-10 flex-none items-center justify-center rounded-[10px] ${colours[type.systemKey ?? "custom"]}`}
    >
      <FoodTypeIcon type={type} size={20} />
    </span>
  );
}

export function FoodTypeBadge({ type }: { type: FoodType }) {
  const { t } = useTranslation();

  return <Badge tone={type.systemKey ?? "neutral"}>{foodTypeLabel(type, t)}</Badge>;
}

/** The food's photo, or its type tile when it has none. */
export function FoodImage({
  food,
  decorative = false,
}: {
  food: { photoId: number | null; type: FoodType };
  decorative?: boolean;
}) {
  return food.photoId === null ? (
    <FoodTypeTile type={food.type} decorative={decorative} />
  ) : (
    <img
      src={`/api/images/${food.photoId}`}
      alt=""
      className="size-10 flex-none rounded-[10px] object-cover"
    />
  );
}
