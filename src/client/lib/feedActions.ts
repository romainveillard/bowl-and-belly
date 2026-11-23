import { useTranslation } from "react-i18next";
import { useSnackbar } from "../components/ui/Snackbar.js";
import {
  formatTime,
  useDaySettings,
  useDeleteFeed,
  useLogFeed,
  useRestoreFeed,
  type FeedEntry,
} from "./feeds.js";

/** Log again and delete, shared by the row's swipes, its menu and its desktop buttons. */
export function useFeedActions(petId: number) {
  const { t, i18n } = useTranslation();
  const { data: settings } = useDaySettings();
  const showSnackbar = useSnackbar();
  const logFeed = useLogFeed();
  const deleteFeed = useDeleteFeed();
  const restoreFeed = useRestoreFeed();

  return {
    logAgain: (entry: FeedEntry) =>
      logFeed.mutate({
        petId,
        foodId: entry.food.id,
        servedG: entry.servedG,
        time: null,
        previousLeftover: null,
      }),
    remove: (entry: FeedEntry) =>
      deleteFeed.mutate(entry.id, {
        onSuccess: (deleted) =>
          showSnackbar({
            message: t("feed.deleted"),
            detail: t("feed.deletedDetail", {
              time: formatTime(entry.fedAt, settings?.timeZone ?? "UTC", i18n.language),
              name: entry.food.name,
              served: entry.servedG,
            }),
            // A newer snackbar replaces this one, which makes this delete final.
            action: { label: t("feed.undo"), onClick: () => restoreFeed.mutate(deleted) },
          }),
      }),
  };
}
