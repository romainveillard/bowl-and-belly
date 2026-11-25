import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { failureReason } from "../lib/apiError.js";
import { useSnackbar } from "./ui/feedback/Snackbar.js";

/** Says what failed and why, in the error snackbar, for every save that names what it does. */
export function SaveErrorNotice() {
  const { t } = useTranslation();
  const showSnackbar = useSnackbar();
  const queryClient = useQueryClient();

  useEffect(
    () =>
      queryClient.getMutationCache().subscribe((event) => {
        if (event.type !== "updated" || event.action.type !== "error") {
          return;
        }
        const failed = event.mutation.options.meta?.failed;
        if (!failed) {
          return;
        }
        const reason = failureReason(event.action.error, t);
        if (reason !== null) {
          showSnackbar({ tone: "error", message: t(`errors.failed.${failed}`), detail: reason });
        }
      }),
    [queryClient, showSnackbar, t],
  );
  return null;
}
