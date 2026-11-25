import { eq } from "drizzle-orm";
import { addDays, appDayOf, instantAt } from "../../shared/app-day.js";
import type { DbOrTx } from "../db/open.js";
import { food, foodType, pet, petType, settings, weightEntry } from "../db/schema.js";
import { logFeed } from "../feeds/entries.js";
import { restock } from "../foods/restock.js";
import { chooseTarget, targetOn } from "../pets/targets.js";

const DAYS = 90;
const TIME_ZONE = "Europe/London";

// A fixed seed, so every run tells the same story, shifted to end today.
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface Meal {
  time: string;
  foodId: number;
  /** Share of the day's calories. */
  share: number;
  /** Leftovers of a returning type go back into stock; the rest are binned. */
  returns: boolean;
}

interface Restock {
  foodId: number;
  /** Below this, a pack is added at the end of the day. */
  belowG: number;
  packG: number;
}

/**
 * Fills a freshly opened database with three pets and about three months of
 * feeds, weigh-ins and stock ending at `now`, written through the same code
 * as the API so every invariant holds.
 */
export function generateDemo(db: DbOrTx, now: Date): void {
  const next = random(20_261_123);
  const between = (low: number, high: number) => low + next() * (high - low);
  const day = { timeZone: TIME_ZONE, dayStartsAt: "00:00" };
  const today = appDayOf(now, day);
  const first = addDays(today, -DAYS);
  const yearsAgo = (years: number, monthDay: string) =>
    `${Number(today.slice(0, 4)) - years}-${monthDay}`;

  db.update(settings).set({ timeZone: TIME_ZONE, dayStartsAt: "00:00" }).run();

  const petTypeId = (key: "cat" | "dog") =>
    db.select().from(petType).where(eq(petType.systemKey, key)).get()?.id ?? 0;
  const foodTypeId = (key: "wet" | "dry") =>
    db.select().from(foodType).where(eq(foodType.systemKey, key)).get()?.id ?? 0;
  const cat = petTypeId("cat");
  const dog = petTypeId("dog");
  const wet = foodTypeId("wet");
  const dry = foodTypeId("dry");
  const rabbit = db.insert(petType).values({ name: "Rabbit" }).returning().get().id;
  const fresh = db
    .insert(foodType)
    .values({ name: "Fresh", leftoverReturnsToStock: false })
    .returning()
    .get().id;

  const kcalOf = new Map<number, number>();
  const addFood = (values: typeof food.$inferInsert) => {
    const { id } = db.insert(food).values(values).returning().get();
    kcalOf.set(id, values.kcalPerKg);
    return id;
  };
  const gravy = addFood({
    name: "Chicken in gravy",
    brand: "Purrfect",
    foodTypeId: wet,
    petTypeId: cat,
    kcalPerKg: 800,
    portionName: "Pouch",
    portionG: 85,
    stockUnit: "portion",
    stockG: 24 * 85,
  });
  const kibbles = addFood({
    name: "Salmon kibbles",
    brand: "Purrfect",
    foodTypeId: dry,
    petTypeId: cat,
    kcalPerKg: 3700,
    stockG: 2000,
  });
  const lamb = addFood({
    name: "Lamb and rice",
    brand: "Good Boy",
    foodTypeId: dry,
    petTypeId: dog,
    kcalPerKg: 3500,
    stockG: 12_000,
  });
  const chunks = addFood({
    name: "Beef chunks",
    brand: "Good Boy",
    foodTypeId: wet,
    petTypeId: dog,
    kcalPerKg: 900,
    portionName: "Tin",
    portionG: 400,
    stockUnit: "portion",
    stockG: 12 * 400,
  });
  const pellets = addFood({
    name: "Timothy pellets",
    foodTypeId: dry,
    petTypeId: rabbit,
    kcalPerKg: 2600,
    stockG: 2500,
  });
  const greens = addFood({
    name: "Mixed greens",
    foodTypeId: fresh,
    petTypeId: rabbit,
    kcalPerKg: 250,
    stockG: 1500,
  });
  // Fed until a month ago, then swapped for the chicken.
  const turkey = addFood({
    name: "Turkey pâté",
    brand: "Purrfect",
    foodTypeId: wet,
    petTypeId: cat,
    kcalPerKg: 950,
    portionName: "Tray",
    portionG: 85,
    stockUnit: "portion",
    stockG: 6 * 85,
  });
  const turkeyUntil = addDays(today, -30);

  const addPet = (values: typeof pet.$inferInsert) =>
    db.insert(pet).values(values).returning().get().id;
  const miso = addPet({
    name: "Miso",
    petTypeId: cat,
    birthDate: yearsAgo(4, "05-14"),
    birthDatePrecision: "exact",
    neutered: true,
    activityLevel: "normal",
    goal: "maintain",
  });
  // Starts on maintain; put on a diet three weeks in.
  const biscuit = addPet({
    name: "Biscuit",
    petTypeId: dog,
    birthDate: yearsAgo(6, "01-01"),
    birthDatePrecision: "year",
    neutered: true,
    activityLevel: "normal",
    goal: "maintain",
  });
  const clover = addPet({
    name: "Clover",
    petTypeId: rabbit,
    birthDate: yearsAgo(2, "03-01"),
    birthDatePrecision: "estimated",
    neutered: true,
    activityLevel: "active",
    goal: "maintain",
  });

  const weighIn = (petId: number, on: string, weightG: number) =>
    db
      .insert(weightEntry)
      .values({ petId, measuredAt: instantAt(on, "09:00", TIME_ZONE), weightG })
      .run();
  // Biscuit slims from 24.6 kg towards the 22 kg goal; the others hold steady.
  const weightOn = (petId: number, offset: number) => {
    if (petId === biscuit) {
      return Math.round(24_600 - Math.max(0, offset - 21) * 20 + between(-120, 120));
    }
    return Math.round((petId === miso ? 4300 : 2100) + between(-50, 50));
  };
  for (const petId of [miso, biscuit, clover]) {
    weighIn(petId, first, weightOn(petId, 0));
  }
  chooseTarget(db, miso, first, null);
  chooseTarget(db, biscuit, first, null);
  chooseTarget(db, clover, first, 180);

  const meals: Record<number, (on: string) => Meal[]> = {
    [miso]: (on) => [
      { time: "07:30", foodId: kibbles, share: 0.35, returns: true },
      { time: "12:15", foodId: on < turkeyUntil ? turkey : gravy, share: 0.2, returns: false },
      { time: "17:45", foodId: on < turkeyUntil ? turkey : gravy, share: 0.2, returns: false },
      { time: "21:30", foodId: kibbles, share: 0.25, returns: true },
    ],
    [biscuit]: () => [
      { time: "07:00", foodId: lamb, share: 0.45, returns: true },
      { time: "18:00", foodId: lamb, share: 0.3, returns: true },
      { time: "18:05", foodId: chunks, share: 0.25, returns: false },
    ],
    [clover]: () => [
      { time: "08:00", foodId: greens, share: 0.35, returns: false },
      { time: "08:05", foodId: pellets, share: 0.4, returns: true },
      { time: "19:00", foodId: greens, share: 0.25, returns: false },
    ],
  };

  const restocks: Restock[] = [
    { foodId: gravy, belowG: 4 * 85, packG: 24 * 85 },
    { foodId: kibbles, belowG: 300, packG: 2000 },
    { foodId: lamb, belowG: 1500, packG: 12_000 },
    { foodId: chunks, belowG: 2 * 400, packG: 12 * 400 },
    { foodId: pellets, belowG: 400, packG: 2500 },
    { foodId: greens, belowG: 300, packG: 1500 },
  ];

  for (let offset = 0; offset <= DAYS; offset++) {
    const on = addDays(first, offset);
    if (offset > 0 && offset % 7 === 0) {
      for (const petId of [miso, biscuit]) {
        weighIn(petId, on, weightOn(petId, offset));
      }
      if (offset % 14 === 0) {
        weighIn(clover, on, weightOn(clover, offset));
      }
    }
    if (offset === 21) {
      db.update(pet).set({ goal: "lose", targetWeightG: 22_000 }).where(eq(pet.id, biscuit)).run();
      chooseTarget(db, biscuit, on, null);
    }
    for (const petId of [miso, biscuit, clover]) {
      const targetKcal = targetOn(db, petId, on)?.kcalPerDay ?? 0;
      // Most days land within 5% of the target; some run over or under.
      const appetite = between(0.9, 1.08);
      for (const meal of meals[petId]?.(on) ?? []) {
        const fedAt = new Date(
          instantAt(on, meal.time, TIME_ZONE).getTime() + Math.round(between(-20, 20)) * 60_000,
        );
        if (fedAt > now) {
          continue;
        }
        const kcal = targetKcal * meal.share * appetite;
        const servedG = Math.max(1, Math.round((kcal / (kcalOf.get(meal.foodId) ?? 1000)) * 1000));
        // Recent feeds have nothing left over yet; older ones sometimes do.
        const leftoverG =
          now.getTime() - fedAt.getTime() > 6 * 3_600_000 && next() < 0.12
            ? Math.min(servedG - 1, Math.round(between(2, servedG * 0.25)))
            : null;
        logFeed(db, {
          petId,
          foodId: meal.foodId,
          fedAt,
          servedG,
          leftoverG,
          leftoverReturnedToStock: leftoverG !== null && meal.returns,
        });
      }
    }
    for (const { foodId, belowG, packG } of restocks) {
      const stockG =
        db.select({ stockG: food.stockG }).from(food).where(eq(food.id, foodId)).get()?.stockG ?? 0;
      if (stockG < belowG) {
        restock(db, foodId, packG);
      }
    }
  }

  // Beef chunks are down to an opened tin, to show a food about to run out.
  db.update(food).set({ stockG: 150 }).where(eq(food.id, chunks)).run();
  db.update(food)
    .set({ archivedAt: instantAt(turkeyUntil, "12:00", TIME_ZONE) })
    .where(eq(food.id, turkey))
    .run();
}
