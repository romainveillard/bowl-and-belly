import { useRef } from "react";
import { uploadPhoto } from "../lib/images.js";
import { CameraIcon } from "./icons.js";
import { button } from "./ui/forms/button.js";

type PhotoPickerProps = {
  photoId: number | null;
  onChange: (photoId: number | null) => void;
  /** In the empty slot. */
  label: string;
  alt: string;
  /** Beside the empty slot. */
  hint: string;
} &
  /** A pet: the photo fills a round slot that is tapped to change it. */
  (
    | { shape: "round" }
    /** A food: a wide photo, with buttons to change or remove it. */
    | { shape: "wide"; changeLabel: string; removeLabel: string }
  );

/** Picks a photo and uploads it straight away, ahead of the form being saved. */
export function PhotoPicker(props: PhotoPickerProps) {
  const { photoId, onChange, label, alt, hint, shape } = props;
  const fileInput = useRef<HTMLInputElement>(null);
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
            void uploadPhoto(file).then(onChange);
          }
        }}
      />
      {props.shape === "wide" && photo !== null ? (
        <div className="flex flex-col gap-3">
          <img src={photo} alt={alt} className="h-[180px] w-full rounded-xl object-cover" />
          <div className="flex gap-2">
            <button type="button" className={button.outline} onClick={choose}>
              {props.changeLabel}
            </button>
            <button type="button" className={button.dangerGhost} onClick={() => onChange(null)}>
              {props.removeLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-3.5 ${shape === "round" ? "desktop:gap-4" : ""}`}>
          <button
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
          <span className="text-[13px] text-muted-foreground">{hint}</span>
        </div>
      )}
    </>
  );
}
