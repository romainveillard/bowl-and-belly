import { describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import { food } from "../db/schema.js";
import { restock } from "./restock.js";

function foodWithStock(stockG: number) {
  const db = openDatabase(":memory:");
  db.insert(food).values({ name: "Salmon kibbles", foodTypeId: 2, kcalPerKg: 3700, stockG }).run();
  const stock = () => db.select({ stockG: food.stockG }).from(food).get()?.stockG;
  return { db, stock };
}

describe("restock", () => {
  it("adds to what is left", () => {
    const { db, stock } = foodWithStock(200);

    restock(db, 1, 2000);

    expect(stock()).toBe(2200);
  });

  it("starts from an empty shelf when the stock had run below zero", () => {
    const { db, stock } = foodWithStock(-50);

    restock(db, 1, 2000);

    expect(stock()).toBe(2000);
  });
});
