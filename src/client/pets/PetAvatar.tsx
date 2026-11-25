import { PetsIcon } from "../components/icons.js";

interface PetAvatarProps {
  photoId: number | null;
  /** Diameter in px. */
  size: number;
  /** White instead of peach, for use on a selected (peach) card. */
  onAccent?: boolean;
  /** Grey instead of peach, for a pet that is archived. */
  archived?: boolean;
}

export function PetAvatar({ photoId, size, onAccent = false, archived = false }: PetAvatarProps) {
  if (photoId !== null) {
    return (
      <img
        src={`/api/images/${photoId}`}
        alt=""
        width={size}
        height={size}
        className="flex-none rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full text-primary-strong ${archived ? "bg-muted" : onAccent ? "bg-card" : "bg-accent-soft"}`}
      style={{ width: size, height: size }}
    >
      <PetsIcon size={Math.round(size / 2)} />
    </span>
  );
}
