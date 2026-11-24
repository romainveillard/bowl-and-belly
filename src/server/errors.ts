import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** The SQLite result code behind an error, looking through Drizzle's wrapping. */
function sqliteCode(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (
      "code" in current &&
      typeof current.code === "string" &&
      current.code.startsWith("SQLITE_")
    ) {
      return current.code;
    }
  }
  return undefined;
}

/** What an error the routes didn't handle answers, as a code like every other response. */
export function errorResponse(error: unknown): {
  status: ContentfulStatusCode;
  code: "forbidden" | "invalid_reference" | "invalid_request" | "internal";
} {
  if (error instanceof HTTPException && error.status === 403) {
    // The CSRF check throws this for a form posted from another site.
    return { status: 403, code: "forbidden" };
  }
  if (error instanceof HTTPException && error.status < 500) {
    // Hono's validator throws this for a body that isn't JSON at all.
    return { status: error.status, code: "invalid_request" };
  }
  const code = sqliteCode(error);
  // Routes check the resource in their URL themselves, so a missing row here
  // is one the request body named.
  if (code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    return { status: 400, code: "invalid_reference" };
  }
  if (code?.startsWith("SQLITE_CONSTRAINT")) {
    return { status: 400, code: "invalid_request" };
  }
  return { status: 500, code: "internal" };
}

export const onApiError: ErrorHandler = (error, c) => {
  const { status, code } = errorResponse(error);
  if (status === 500) {
    console.error(`${c.req.method} ${c.req.path} failed`, error);
  }
  return c.json({ code }, status);
};
