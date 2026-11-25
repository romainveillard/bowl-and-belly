import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The module opens the database on import.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "bowl-access-"));
const { passwordProblem } = await import("./access.js");

describe("passwordProblem", () => {
  it("refuses the README's example and anything under 12 characters", () => {
    expect(
      ["change-me", "elevenchars", "twelve chars", "🐈🐈🐈🐈🐈🐈🐈🐈🐈🐈🐈", "🐈🐈🐈🐈🐈🐈🐈🐈🐈🐈🐈🐈"].map(
        (password) => passwordProblem(password) !== null,
      ),
    ).toEqual([true, true, false, true, false]);
  });

  it("has nothing to say when no password is set", () => {
    expect(passwordProblem(null)).toBeNull();
  });
});
