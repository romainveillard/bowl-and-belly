import { PetsIcon } from "../components/icons.js";

interface PetAvatarProps {
  photoId: number | null;
  /** Size classes, such as "size-11 desktop:size-10", so one element serves every layout. */
  size: string;
  /** White instead of peach, for use on a selected (peach) card, or only where it is peach. */
  onAccent?: boolean | "desktop";
  /** Grey instead of peach, for a pet that is archived. */
  archived?: boolean;
}

export function PetAvatar({ photoId, size, onAccent = false, archived = false }: PetAvatarProps) {
  if (photoId !== null) {
    return (
      <img
        src={`/api/images/${photoId}`}
        alt=""
        className={`${size} flex-none rounded-full object-cover`}
      />
    );
  }
  const background = archived
    ? "bg-muted"
    : onAccent === true
      ? "bg-card"
      : onAccent === "desktop"
        ? "bg-accent-soft desktop:bg-card"
        : "bg-accent-soft";
  return (
    <span
      aria-hidden="true"
      className={`${size} flex flex-none items-center justify-center rounded-full text-primary-strong *:size-1/2 ${background}`}
    >
      <PetsIcon />
    </span>
  );
}
