import i18next from "i18next";
import ICU from "i18next-icu";
import { describe, expect, it } from "vitest";
import enGB from "../i18n/locales/en-GB.json" with { type: "json" };
import fr from "../i18n/locales/fr.json" with { type: "json" };
import { matchesFood, portionUnit, stockLabel } from "./foods.js";

const i18n = i18next.createInstance();
await i18n.use(ICU).init({
  lng: "en-GB",
  resources: { "en-GB": { translation: enGB }, fr: { translation: fr } },
});

const pouches = { stockUnit: "portion", portionName: "Pouch", portionG: 85 } as const;
const grams = { stockUnit: "g", portionName: null, portionG: null } as const;

describe("stockLabel", () => {
  it("counts portions with the remainder in grams, and plain grams under one portion", () => {
    expect(stockLabel({ ...pouches, stockG: 725 }, i18n)).toBe("8 pouches + 45 g");
    expect(stockLabel({ ...pouches, stockG: 85 }, i18n)).toBe("1 pouch");
    expect(stockLabel({ ...pouches, stockG: 45 }, i18n)).toBe("45 g");
  });

  it("switches to kg from 1,000 g", () => {
    expect(stockLabel({ ...grams, stockG: 999 }, i18n)).toBe("999 g");
    expect(stockLabel({ ...grams, stockG: 1450 }, i18n)).toBe("1.5 kg");
  });

  it("never shows zero or a negative count, only out of stock", () => {
    expect(stockLabel({ ...grams, stockG: 0 }, i18n)).toBe("Out of stock");
    expect(stockLabel({ ...pouches, stockG: -40 }, i18n)).toBe("Out of stock");
  });

  it("recognises a suggested portion name saved in another language", () => {
    const tins = { ...pouches, portionName: "Boîte", portionG: 200 };

    expect(stockLabel({ ...tins, stockG: 600 }, i18n)).toBe("3 tins");
  });

  it("adds a plain s to a typed portion name, keeping it as typed", () => {
    expect(stockLabel({ ...pouches, portionName: "carton", stockG: 255 }, i18n)).toBe("3 cartons");
    expect(stockLabel({ ...pouches, portionName: "Carton", stockG: 255 }, i18n)).toBe("3 Cartons");
  });
});

describe("matchesFood", () => {
  const kibbles = { name: "Salmon kibbles", brand: "Purrfect", type: { id: 2 } };

  it("finds a food by its name or brand, whatever the case or the spaces around", () => {
    expect(matchesFood(kibbles, "  SALMON ", null, "en-GB")).toBe(true);
    expect(matchesFood(kibbles, "purr", null, "en-GB")).toBe(true);
    expect(matchesFood(kibbles, "chicken", null, "en-GB")).toBe(false);
  });

  it("keeps only the chosen type", () => {
    expect(matchesFood(kibbles, "", 2, "en-GB")).toBe(true);
    expect(matchesFood(kibbles, "", 1, "en-GB")).toBe(false);
  });
});

describe("portionUnit", () => {
  it("uses each language's own word after a number, not its label lower-cased", () => {
    expect(portionUnit("Pouch", i18n)).toBe("pouches");
    expect(portionUnit("Pouch", i18n.cloneInstance({ lng: "fr" }))).toBe("sachets");
    // A key of its own, so a language that capitalises nouns keeps "Beutel", not "beutel".
    const german = i18n.cloneInstance({ lng: "de" });
    german.addResourceBundle("de", "translation", {
      portionPlural: { pouch: "Beutel" },
      portionUnit: { pouch: "Beutel" },
    });
    expect(portionUnit("Pouch", german)).toBe("Beutel");
    // A typed name stays as typed, as in the stock count.
    expect(portionUnit("Scoop", i18n)).toBe("Scoops");
  });
});
