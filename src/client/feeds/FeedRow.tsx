import { useRef, useState, type PointerEvent } from "react";
import { listRow, RowHoverActions } from "../components/ui/layout/List.js";
import { useTranslation } from "react-i18next";
import type { FeedEntry } from "./feeds.js";
import { formatTime } from "../lib/format.js";
import { FoodTypeTile } from "../stock/FoodTypeMark.js";
import { RepeatIcon, TrashIcon } from "../components/icons.js";

/** How far a row must be swiped for its action to happen. */
const SWIPE_PX = 104;

interface FeedRowProps {
  entry: FeedEntry;
  timeZone: string;
  onOpen: () => void;
  onLogAgain: () => void;
  onDelete: () => void;
  /** Plays the one-off hint that the row can be swiped. */
  peek?: boolean;
}

/**
 * One feed: tap for its actions; on a touch screen, swipe right to log it
 * again or left to delete it; on desktop, the same two as buttons on hover.
 */
export function FeedRow({
  entry,
  timeZone,
  onOpen,
  onLogAgain,
  onDelete,
  peek = false,
}: FeedRowProps) {
  const { t, i18n } = useTranslation();
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; y: number; swiping: boolean } | null>(null);
  const swiped = useRef(false);

  const time = formatTime(entry.fedAt, timeZone, i18n.language);
  const detail =
    entry.leftoverG === null
      ? t("feed.detail", { time, served: entry.servedG })
      : t("feed.detailLeft", { time, served: entry.servedG, left: entry.leftoverG });

  const onPointerDown = (event: PointerEvent) => {
    // A browser may or may not send a click after a swipe, so the flag that
    // swallows that click only lasts until the next touch.
    swiped.current = false;
    if (event.pointerType !== "mouse") {
      drag.current = { x: event.clientX, y: event.clientY, swiping: false };
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    const start = drag.current;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    if (!start.swiping) {
      // Mostly vertical movement is a scroll, left to the browser.
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(event.clientY - start.y)) {
        return;
      }
      start.swiping = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset(Math.max(-SWIPE_PX * 1.5, Math.min(SWIPE_PX * 1.5, dx)));
  };
  const onPointerEnd = () => {
    if (drag.current?.swiping) {
      swiped.current = true;
      if (offset >= SWIPE_PX) {
        onLogAgain();
      } else if (offset <= -SWIPE_PX) {
        onDelete();
      }
    }
    drag.current = null;
    setOffset(0);
  };

  return (
    <div className={`group relative overflow-hidden ${listRow}`}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center gap-2 px-5 text-sm font-semibold ${offset < 0 ? "justify-end bg-danger text-card" : "bg-primary"}`}
      >
        {offset < 0 ? (
          <>
            {t("feed.delete")}
            <TrashIcon size={20} />
          </>
        ) : (
          <>
            <RepeatIcon size={20} />
            {t("feed.logAgain")}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform: offset === 0 ? undefined : `translateX(${offset}px)` }}
        className={`relative flex min-h-16 w-full cursor-pointer touch-pan-y items-center gap-3 bg-card px-4 py-2.5 text-left desktop:min-h-[60px] desktop:gap-3.5 desktop:group-hover:bg-row-hover ${offset === 0 ? "transition-transform" : ""} ${peek ? "swipe-peek" : ""}`}
      >
        <FoodTypeTile type={entry.type} />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-[15px] font-semibold">{entry.food.name}</span>
          <span className="truncate text-[13px] text-muted-foreground tabular-nums">{detail}</span>
        </span>
        <span className="flex flex-none items-baseline gap-[3px] tabular-nums desktop:w-[76px] desktop:justify-end">
          <span className="text-base font-semibold">{entry.kcal}</span>
          <span className="text-[13px] text-muted-foreground">{t("common.kcal")}</span>
        </span>
      </button>
      <RowHoverActions
        className="right-[106px]"
        actions={[
          {
            icon: <RepeatIcon size={18} />,
            label: t("feed.logAgainNamed", { name: entry.food.name }),
            onClick: onLogAgain,
          },
          {
            icon: <TrashIcon size={18} />,
            label: t("feed.deleteNamed", { name: entry.food.name }),
            onClick: onDelete,
            danger: true,
          },
        ]}
      />
    </div>
  );
}
