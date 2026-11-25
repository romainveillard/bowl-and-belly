import type { ReactNode } from "react";
import { FoodImage } from "./FoodTypeMark.js";

interface FoodRowProps {
  food: {
    name: string;
    brand: string | null;
    photoId: number | null;
    type: { systemKey: "wet" | "dry" | null; name: string | null };
  };
  /** On the right, such as the stock left or a Change button. */
  trailing: ReactNode;
  /** The brand in the darker text that reads on the peach highlight. */
  onAccent?: boolean;
}

/**
 * A food's photo or type tile, name and brand, for the inside of a row:
 * the parent draws the row itself, as a button or a highlighted box.
 */
export function FoodRow({ food, trailing, onAccent = false }: FoodRowProps) {
  return (
    <>
      <FoodImage food={food} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{food.name}</span>
        {food.brand && (
          <span
            className={`truncate text-[13px] ${onAccent ? "text-accent-foreground" : "text-muted-foreground"}`}
          >
            {food.brand}
          </span>
        )}
      </span>
      {trailing}
    </>
  );
}
