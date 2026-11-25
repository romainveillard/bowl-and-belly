import { useState } from "react";
import { useFeedActions } from "./feedActions.js";
import type { FeedEntry } from "./feeds.js";
import { AddLeftoverSheet } from "./AddLeftoverSheet.js";
import { EditFeedSheet } from "./EditFeedSheet.js";
import { FeedActionsSheet } from "./FeedActionsSheet.js";

interface Opened {
  sheet: "actions" | "edit" | "leftover";
  entry: FeedEntry;
  day: string;
}

/** The sheets a feed row opens, shared by Today and History. */
export function useFeedSheets(petId: number, today: string, timeZone: string) {
  const actions = useFeedActions(petId);
  const [opened, setOpened] = useState<Opened | null>(null);
  const close = () => setOpened(null);

  let sheet = null;
  if (opened?.sheet === "actions") {
    const { entry } = opened;
    sheet = (
      <FeedActionsSheet
        entry={entry}
        day={opened.day}
        today={today}
        timeZone={timeZone}
        onEdit={() => setOpened({ ...opened, sheet: "edit" })}
        onAddLeftover={() => setOpened({ ...opened, sheet: "leftover" })}
        onLogAgain={() => actions.logAgain(entry)}
        onDelete={() => actions.remove(entry)}
        onClose={close}
      />
    );
  } else if (opened?.sheet === "edit") {
    sheet = (
      <EditFeedSheet
        entry={opened.entry}
        petId={petId}
        day={opened.day}
        today={today}
        timeZone={timeZone}
        onClose={close}
      />
    );
  } else if (opened?.sheet === "leftover") {
    sheet = <AddLeftoverSheet entry={opened.entry} timeZone={timeZone} onClose={close} />;
  }

  return {
    open: (entry: FeedEntry, day: string) => setOpened({ sheet: "actions", entry, day }),
    logAgain: actions.logAgain,
    remove: actions.remove,
    sheet,
  };
}
