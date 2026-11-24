import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./db/open.js";
import { pet } from "./db/schema.js";
import { errorResponse } from "./errors.js";

function thrownBy(write: () => unknown): unknown {
  try {
    write();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the write to fail");
}

describe("errorResponse", () => {
  it("answers invalid_reference for a reference to a row that doesn't exist", () => {
    const db = openDatabase(":memory:");
    const error = thrownBy(() =>
      db
        .insert(pet)
        .values({
          name: "Miso",
          petTypeId: 99,
          birthDate: "2020-05-01",
          birthDatePrecision: "exact",
          neutered: true,
          activityLevel: "normal",
          goal: "maintain",
        })
        .run(),
    );

    expect(errorResponse(error)).toEqual({ status: 400, code: "invalid_reference" });
  });

  it("answers invalid_request for values a CHECK constraint refuses", () => {
    const db = openDatabase(":memory:");
    // A weight-loss goal needs a target weight.
    const error = thrownBy(() =>
      db
        .insert(pet)
        .values({
          name: "Miso",
          petTypeId: 1,
          birthDate: "2020-05-01",
          birthDatePrecision: "exact",
          neutered: true,
          activityLevel: "normal",
          goal: "lose",
        })
        .run(),
    );

    expect(errorResponse(error)).toEqual({ status: 400, code: "invalid_request" });
  });

  it("answers invalid_request for a body that isn't JSON", () => {
    expect(errorResponse(new HTTPException(400, { message: "Malformed JSON" }))).toEqual({
      status: 400,
      code: "invalid_request",
    });
  });

  it("answers internal for anything else", () => {
    expect(errorResponse(new Error("Disk on fire"))).toEqual({ status: 500, code: "internal" });
  });
});
