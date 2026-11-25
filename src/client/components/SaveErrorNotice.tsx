import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { failureReason } from "../lib/apiError.js";
import { useSnackbar } from "./ui/feedback/Snackbar.js";
import { reportInOpenSheet } from "./ui/overlays/sheetErrors.js";

/**
 * Says what failed and why, for every save that names what it does: in the
 * open sheet, or else in the error snackbar.
 */
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
        if (reason === null) {
          return;
        }
        const error = { message: t(`errors.failed.${failed}`), detail: reason };
        if (!reportInOpenSheet(error)) {
          showSnackbar({ tone: "error", ...error });
        }
      }),
    [queryClient, showSnackbar, t],
  );
  return null;
}
