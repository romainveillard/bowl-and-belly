import { useId, useRef } from "react";
import { useUploadPhoto } from "../lib/images.js";
import { useFocusNext } from "../lib/useFocusNext.js";
import { CameraIcon } from "./icons.js";
import { button } from "./ui/forms/button.js";

type PhotoPickerProps = {
  photoId: number | null;
  onChange: (photoId: number | null) => void;
  /** In the empty slot. */
  label: string;
  /** What the empty slot does, when `label` alone doesn't say: "Add photo". */
  addLabel?: string;
  changeLabel: string;
  alt: string;
  /** Beside the empty slot. */
  hint: string;
} &
  /** A pet: the photo fills a round slot that is tapped to change it. */
  (
    | { shape: "round" }
    /** A food: a wide photo, with buttons to change or remove it. */
    | { shape: "wide"; removeLabel: string }
  );

/** Picks a photo and uploads it straight away, ahead of the form being saved. */
export function PhotoPicker(props: PhotoPickerProps) {
  const { photoId, onChange, label, addLabel = label, changeLabel, alt, hint, shape } = props;
  const hintId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const emptySlot = useRef<HTMLButtonElement>(null);
  const focusNext = useFocusNext();
  const upload = useUploadPhoto();
  const choose = () => fileInput.current?.click();
  const photo = photoId === null ? null : `/api/images/${photoId}`;

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            upload.mutate(file, { onSuccess: onChange });
          }
          // Picking the same file again, after a failed upload, must still fire change.
          event.target.value = "";
        }}
      />
      {props.shape === "wide" && photo !== null ? (
        <div className="flex flex-col gap-3">
          <img src={photo} alt={alt} className="h-[180px] w-full rounded-xl object-cover" />
          <div className="flex gap-2">
            <button type="button" className={button.outline} onClick={choose}>
              {changeLabel}
            </button>
            <button
              type="button"
              className={button.dangerGhost}
              onClick={() => {
                onChange(null);
                focusNext(() => emptySlot.current);
              }}
            >
              {props.removeLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-3.5 ${shape === "round" ? "desktop:gap-4" : ""}`}>
          <button
            ref={emptySlot}
            aria-label={photo === null ? addLabel : changeLabel}
            aria-describedby={hintId}
            type="button"
            onClick={choose}
            className={`flex size-[88px] flex-none cursor-pointer flex-col items-center justify-center gap-1.5 border-[1.5px] border-dashed border-outline bg-background text-[13px] font-medium text-muted-foreground ${shape === "round" ? "overflow-hidden rounded-full desktop:size-24" : "rounded-xl"}`}
          >
            {photo === null ? (
              <>
                <CameraIcon />
                {label}
              </>
            ) : (
              <img src={photo} alt={alt} className="size-full object-cover" />
            )}
          </button>
          <span id={hintId} className="text-[13px] text-muted-foreground">
            {hint}
          </span>
        </div>
      )}
    </>
  );
}
