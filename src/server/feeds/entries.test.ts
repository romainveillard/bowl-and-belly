import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { feedEntry, food, pet } from "../db/schema.js";
import {
  deleteFeed,
  editFeed,
  editFromForm,
  logFeed,
  logFeedWithLeftover,
  recordLeftover,
  restoreFeed,
} from "./entries.js";

// Two foods with 1,000 g in stock each: kibbles at 3,700 kcal/kg, pouches at 800.
function pantry() {
  const db = openDatabase(":memory:");
  db.insert(pet)
    .values({
      name: "Miso",
      petTypeId: 1,
      birthDate: "2020-05-01",
      birthDatePrecision: "exact",
      neutered: true,
      activityLevel: "normal",
      goal: "maintain",
    })
    .run();
  db.insert(food)
    .values([
      { name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700, stockG: 1000 },
      { name: "Chicken in gravy", foodTypeId: 1, kcalPerKg: 800, stockG: 1000 },
    ])
    .run();
  const stock = () =>
    db
      .select({ stockG: food.stockG })
      .from(food)
      .orderBy(food.id)
      .all()
      .map((row) => row.stockG);
  return { db, stock };
}

const kibbles = {
  petId: 1,
  foodId: 1,
  fedAt: new Date("2026-11-23T08:00:00Z"),
  servedG: 20,
  leftoverG: null,
  leftoverReturnedToStock: true,
};

describe("logFeed", () => {
  it("takes what was served out of stock, less a leftover put back", () => {
    const { db, stock } = pantry();

    logFeed(db, kibbles);
    logFeed(db, { ...kibbles, leftoverG: 4 });
    logFeed(db, {
      ...kibbles,
      foodId: 2,
      servedG: 85,
      leftoverG: 10,
      leftoverReturnedToStock: false,
    });

    expect(stock()).toEqual([1000 - 20 - 16, 1000 - 85]);
  });

  it("lets stock run below zero rather than refuse a feed", () => {
    const { db, stock } = pantry();

    logFeed(db, { ...kibbles, servedG: 1200 });

    expect(stock()[0]).toBe(-200);
  });
});

describe("logFeedWithLeftover", () => {
  const next = { petId: 1, foodId: 1, fedAt: new Date("2026-11-23T13:00:00Z"), servedG: 20 };

  it("records the previous feed's leftover, putting dry food back in stock", () => {
    const { db, stock } = pantry();
    const previous = logFeed(db, kibbles) ?? 0;

    logFeedWithLeftover(db, next, { entryId: previous, leftoverG: 5 });

    expect(db.select().from(feedEntry).where(eq(feedEntry.id, previous)).get()).toMatchObject({
      leftoverG: 5,
      leftoverReturnedToStock: true,
    });
    expect(stock()[0]).toBe(1000 - 20 + 5 - 20);
  });

  it("bins a wet food's leftover", () => {
    const { db, stock } = pantry();
    const previous = logFeed(db, { ...kibbles, foodId: 2, servedG: 85 }) ?? 0;

    logFeedWithLeftover(db, next, { entryId: previous, leftoverG: 10 });

    expect(db.select().from(feedEntry).where(eq(feedEntry.id, previous)).get()).toMatchObject({
      leftoverG: 10,
      leftoverReturnedToStock: false,
    });
    expect(stock()[1]).toBe(1000 - 85);
  });

  it("refuses a leftover on another pet's feed or above what was served, logging nothing", () => {
    const { db } = pantry();
    const previous = logFeed(db, kibbles) ?? 0;

    expect(
      logFeedWithLeftover(db, { ...next, petId: 2 }, { entryId: previous, leftoverG: 5 }),
    ).toBe("invalid_leftover");
    expect(logFeedWithLeftover(db, next, { entryId: previous, leftoverG: 21 })).toBe(
      "invalid_leftover",
    );
    expect(db.select().from(feedEntry).all()).toHaveLength(1);
  });
});

describe("editFeed", () => {
  it("moves stock by the difference", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, kibbles) ?? 0;

    editFeed(db, id, { ...kibbles, servedG: 30, leftoverG: 5 });

    expect(stock()[0]).toBe(1000 - 25);
  });

  it("puts a leftover back only when it is marked as returned", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, { ...kibbles, leftoverG: 4 }) ?? 0;

    editFeed(db, id, { ...kibbles, leftoverG: 4, leftoverReturnedToStock: false });

    expect(stock()[0]).toBe(1000 - 20);
  });

  it("moves the stock and the kcal snapshot to the new food when the food changes", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, kibbles) ?? 0;
    db.update(food).set({ kcalPerKg: 3800 }).where(eq(food.id, 1)).run();

    editFeed(db, id, { ...kibbles, foodId: 2, servedG: 85 });

    expect(stock()).toEqual([1000, 1000 - 85]);
    expect(db.select({ kcalPerKg: feedEntry.kcalPerKg }).from(feedEntry).get()).toEqual({
      kcalPerKg: 800,
    });
  });

  it("keeps the kcal snapshot when the food stays the same", () => {
    const { db } = pantry();
    const id = logFeed(db, kibbles) ?? 0;
    db.update(food).set({ kcalPerKg: 3800 }).where(eq(food.id, 1)).run();

    editFeed(db, id, { ...kibbles, servedG: 25 });

    expect(db.select({ kcalPerKg: feedEntry.kcalPerKg }).from(feedEntry).get()).toEqual({
      kcalPerKg: 3700,
    });
  });
});

describe("editFromForm", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const form = {
    foodId: 1,
    fedAt: new Date("2026-11-23T08:00:00Z"),
    servedG: 20,
    leftoverG: null,
    leftoverReturnedToStock: true,
  };

  it("refuses a leftover above what was served, or a time still to come, changing nothing", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, kibbles) ?? 0;

    expect(editFromForm(db, id, { ...form, servedG: 30, leftoverG: 31 }, now)).toBe(
      "invalid_leftover",
    );
    expect(
      editFromForm(db, id, { ...form, servedG: 30, fedAt: new Date(now.getTime() + 1) }, now),
    ).toBe("in_future");
    expect(stock()[0]).toBe(980);
  });

  it("keeps the feed on its pet", () => {
    const { db } = pantry();
    const id = logFeed(db, kibbles) ?? 0;

    expect(editFromForm(db, id, { ...form, foodId: 2 }, now)).toBeUndefined();
    expect(
      db.select({ petId: feedEntry.petId, foodId: feedEntry.foodId }).from(feedEntry).get(),
    ).toEqual({
      petId: 1,
      foodId: 2,
    });
  });
});

describe("recordLeftover", () => {
  it("refuses a leftover above what was served", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, kibbles) ?? 0;

    expect(recordLeftover(db, id, { leftoverG: 21, leftoverReturnedToStock: true })).toBe(
      "invalid_leftover",
    );
    expect(
      recordLeftover(db, id, { leftoverG: 20, leftoverReturnedToStock: true }),
    ).toBeUndefined();
    expect(stock()[0]).toBe(1000);
  });
});

describe("deleteFeed", () => {
  it("returns what the entry took out of stock: served less a leftover already put back", () => {
    const { db, stock } = pantry();
    const returned = logFeed(db, { ...kibbles, leftoverG: 4 }) ?? 0;
    const binned =
      logFeed(db, {
        ...kibbles,
        foodId: 2,
        servedG: 85,
        leftoverG: 10,
        leftoverReturnedToStock: false,
      }) ?? 0;

    deleteFeed(db, returned);
    deleteFeed(db, binned);

    expect(stock()).toEqual([1000, 1000]);
  });

  it("can be undone with the original kcal snapshot, taking the stock again", () => {
    const { db, stock } = pantry();
    const id = logFeed(db, kibbles) ?? 0;
    db.update(food).set({ kcalPerKg: 3800 }).where(eq(food.id, 1)).run();

    const deleted = deleteFeed(db, id);
    if (!deleted) {
      throw new Error("Nothing deleted");
    }
    restoreFeed(db, deleted);

    expect(stock()[0]).toBe(980);
    expect(db.select({ kcalPerKg: feedEntry.kcalPerKg }).from(feedEntry).get()).toEqual({
      kcalPerKg: 3700,
    });
  });
});
