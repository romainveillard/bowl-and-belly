import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { appDayOf } from "../../shared/app-day.js";
import { openDatabase } from "../db/open.js";
import { pet, settings as settingsTable, weightEntry } from "../db/schema.js";
import { chooseTarget } from "../pets/targets.js";
import {
  deleteReading,
  editReading,
  logCurrentWeight,
  logReading,
  measuredOn,
} from "./readings.js";

const utc = (iso: string) => new Date(`${iso}Z`);
const morning = utc("2026-11-20T09:00:00");

// A neutered adult cat weighed at 4 kg on 1 November, with the 238 kcal target
// that gives. At 5 kg the formula suggests 281 kcal.
function catWithTarget() {
  const db = openDatabase(":memory:");
  db.update(settingsTable).set({ timeZone: "UTC", dayStartsAt: "00:00" }).run();
  const { id } = db
    .insert(pet)
    .values({
      name: "Miso",
      petTypeId: 1,
      birthDate: "2020-05-01",
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .returning({ id: pet.id })
    .get();
  const first = db
    .insert(weightEntry)
    .values({ petId: id, measuredAt: utc("2026-11-01T08:00:00"), weightG: 4000 })
    .returning({ id: weightEntry.id })
    .get().id;
  chooseTarget(db, id, "2026-11-01", null);
  return { db, petId: id, first };
}

describe("logReading", () => {
  it("asks about the target after a reading that is now the latest", () => {
    const { db, petId } = catWithTarget();

    expect(
      logReading(db, { petId, weightG: 5000, date: "2026-11-20" }, morning)?.prompt,
    ).toMatchObject({ currentKcal: 238, suggestedKcal: 281 });
  });

  it("only adds a backdated reading to the history", () => {
    const { db, petId } = catWithTarget();

    expect(
      logReading(db, { petId, weightG: 5000, date: "2026-10-20" }, morning)?.prompt,
    ).toBeNull();
  });
});

describe("editReading", () => {
  it("asks again when the edit makes an older reading the latest", () => {
    const { db, petId } = catWithTarget();
    const older = logReading(db, { petId, weightG: 5000, date: "2026-10-20" }, morning)?.id ?? 0;

    expect(
      editReading(db, older, { weightG: 5000, date: "2026-11-15" }, morning)?.prompt,
    ).toMatchObject({ suggestedKcal: 281 });
  });

  it("keeps the time of a reading left on its day", () => {
    const { db, first } = catWithTarget();

    editReading(db, first, { weightG: 4100, date: "2026-11-01" }, morning);

    expect(db.select().from(weightEntry).where(eq(weightEntry.id, first)).get()).toMatchObject({
      weightG: 4100,
      measuredAt: utc("2026-11-01T08:00:00"),
    });
  });
});

describe("deleteReading", () => {
  it("asks again when the latest reading goes", () => {
    const { db, petId } = catWithTarget();
    const latest = logReading(db, { petId, weightG: 5000, date: "2026-11-15" }, morning)?.id ?? 0;
    chooseTarget(db, petId, "2026-11-15", null);

    expect(deleteReading(db, latest, morning)?.prompt).toMatchObject({
      currentKcal: 281,
      suggestedKcal: 238,
    });
  });
});

describe("logCurrentWeight", () => {
  it("logs the pet form's weight only when it differs from the latest reading", () => {
    const { db, petId } = catWithTarget();

    expect(logCurrentWeight(db, petId, 4000, morning)).toBe(false);
    expect(logCurrentWeight(db, petId, null, morning)).toBe(false);
    expect(logCurrentWeight(db, petId, 4200, morning)).toBe(true);
    expect(db.select().from(weightEntry).all()).toHaveLength(2);
  });
});

describe("measuredOn", () => {
  it("keeps the time for a reading dated today, before the calendar day has caught up", () => {
    // 01:00 on the 25th is still the 24th when the day starts at 03:00.
    const settings = { timeZone: "UTC", dayStartsAt: "03:00" };
    const now = utc("2026-11-25T01:00:00");

    expect(measuredOn("2026-11-24", now, settings)).toEqual(now);
  });

  it("puts an earlier reading on its own app day when the day starts late", () => {
    // Midday on the clock would belong to the previous app day here.
    const settings = { timeZone: "Europe/London", dayStartsAt: "23:00" };
    const measured = measuredOn("2026-11-20", utc("2026-11-25T09:00:00"), settings);

    expect(appDayOf(measured, settings)).toBe("2026-11-20");
  });

  it("stays inside a day the clocks shorten", () => {
    const settings = { timeZone: "Europe/London", dayStartsAt: "00:00" };
    const measured = measuredOn("2026-03-29", utc("2026-04-02T09:00:00"), settings);

    expect(measured).toEqual(utc("2026-03-29T11:30:00"));
    expect(appDayOf(measured, settings)).toBe("2026-03-29");
  });
});
