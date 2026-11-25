import type { TFunction } from "i18next";
import type enGB from "../i18n/locales/en-GB.json";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** What the snackbar says failed; a mutation without it reports its own errors. */
      failed?: keyof (typeof enGB)["errors"]["failed"];
    };
  }
}

/** A request the API refused, with the code it answered, if any. */
export class ApiError extends Error {
  constructor(readonly code: string | null) {
    super(code ?? "refused");
  }
}

/** The error for a response that isn't ok, carrying its code when the body has one. */
export async function apiError(response: { json: () => Promise<unknown> }): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const code =
    typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : null;
  return new ApiError(code);
}

/** Codes that already have a notice of their own: the demo's limit and the login screen. */
const NOTICED_ELSEWHERE = new Set(["demo_limit", "unauthorised"]);

/**
 * Why a save failed, as the snackbar's second line, or null when something
 * else already says so. fetch rejects with a TypeError when the server can't
 * be reached at all.
 */
export function failureReason(error: unknown, t: TFunction): string | null {
  if (error instanceof ApiError) {
    if (error.code !== null && NOTICED_ELSEWHERE.has(error.code)) {
      return null;
    }
    const key = `errors.${error.code ?? "unknown"}`;
    return t(key, { defaultValue: t("errors.unknown") });
  }
  return t(error instanceof TypeError ? "errors.network" : "errors.unknown");
}
