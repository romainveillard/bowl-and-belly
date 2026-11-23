import { sql, type SQL } from "drizzle-orm";
import {
  blob,
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
  type SQLiteColumn,
} from "drizzle-orm/sqlite-core";
import {
  ACTIVITY_LEVELS,
  BACKUP_ERRORS,
  BACKUP_FREQUENCIES,
  BIRTH_DATE_PRECISIONS,
  FOOD_TYPE_KEYS,
  GOALS,
  PET_TYPE_KEYS,
  STOCK_UNITS,
  TARGET_SOURCES,
} from "../../shared/enums.js";

// Drizzle's `enum` option only narrows the TypeScript type; SQLite enforces
// nothing without a CHECK.
function oneOf(column: SQLiteColumn, values: readonly string[]): SQL {
  return sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(", "))})`;
}

function isTime(column: SQLiteColumn): SQL {
  return sql`${column} GLOB '[0-2][0-9]:[0-5][0-9]' AND ${column} < '24'`;
}

const id = () => integer().primaryKey({ autoIncrement: true });
const archivedAt = () => integer({ mode: "timestamp_ms" });

export const settings = sqliteTable(
  "settings",
  {
    id: integer().primaryKey(),
    timeZone: text().notNull(),
    dayStartsAt: text().notNull().default("00:00"),
    backupEnabled: integer({ mode: "boolean" }).notNull().default(false),
    backupFrequency: text({ enum: BACKUP_FREQUENCIES }).notNull().default("daily"),
    // ISO weekday: 1 is Monday, 7 is Sunday.
    backupWeekday: integer(),
    backupTime: text().notNull().default("03:00"),
    backupKeep: integer().notNull().default(7),
    // The last scheduled or manual run, while it failed; cleared by a success.
    backupFailedAt: integer({ mode: "timestamp_ms" }),
    backupError: text({ enum: BACKUP_ERRORS }),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check("settings_day_starts_at", isTime(t.dayStartsAt)),
    check("settings_backup_frequency", oneOf(t.backupFrequency, BACKUP_FREQUENCIES)),
    check("settings_backup_weekday", sql`${t.backupWeekday} BETWEEN 1 AND 7`),
    check(
      "settings_weekly_has_weekday",
      sql`${t.backupFrequency} <> 'weekly' OR ${t.backupWeekday} IS NOT NULL`,
    ),
    check("settings_backup_time", isTime(t.backupTime)),
    check("settings_backup_keep", sql`${t.backupKeep} >= 1`),
  ],
);

export const petType = sqliteTable(
  "pet_type",
  {
    id: id(),
    name: text(),
    systemKey: text({ enum: PET_TYPE_KEYS }).unique("pet_type_system_key_unique"),
    archivedAt: archivedAt(),
  },
  (t) => [
    check("pet_type_system_key", oneOf(t.systemKey, PET_TYPE_KEYS)),
    check("pet_type_labelled", sql`${t.systemKey} IS NOT NULL OR ${t.name} IS NOT NULL`),
  ],
);

export const foodType = sqliteTable(
  "food_type",
  {
    id: id(),
    name: text(),
    systemKey: text({ enum: FOOD_TYPE_KEYS }).unique("food_type_system_key_unique"),
    leftoverReturnsToStock: integer({ mode: "boolean" }).notNull(),
    archivedAt: archivedAt(),
  },
  (t) => [
    check("food_type_system_key", oneOf(t.systemKey, FOOD_TYPE_KEYS)),
    check("food_type_labelled", sql`${t.systemKey} IS NOT NULL OR ${t.name} IS NOT NULL`),
  ],
);

// Photos live apart from pets and foods so that listing those never loads blobs.
export const image = sqliteTable("image", {
  id: id(),
  data: blob({ mode: "buffer" }).notNull(),
});

export const pet = sqliteTable(
  "pet",
  {
    id: id(),
    name: text().notNull(),
    petTypeId: integer()
      .notNull()
      .references(() => petType.id),
    photoId: integer().references(() => image.id),
    // "YYYY-MM-DD"
    birthDate: text().notNull(),
    birthDatePrecision: text({ enum: BIRTH_DATE_PRECISIONS }).notNull(),
    neutered: integer({ mode: "boolean" }).notNull(),
    activityLevel: text({ enum: ACTIVITY_LEVELS }).notNull(),
    goal: text({ enum: GOALS }).notNull(),
    targetWeightG: integer(),
    // The last age step (in months) whose "update target?" question was answered.
    agePromptMonths: integer(),
    archivedAt: archivedAt(),
  },
  (t) => [
    check("pet_birth_date", sql`${t.birthDate} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`),
    check("pet_birth_date_precision", oneOf(t.birthDatePrecision, BIRTH_DATE_PRECISIONS)),
    check("pet_activity_level", oneOf(t.activityLevel, ACTIVITY_LEVELS)),
    check("pet_goal", oneOf(t.goal, GOALS)),
    check("pet_target_weight_g", sql`${t.targetWeightG} > 0`),
    check(
      "pet_goal_has_target_weight",
      sql`${t.goal} = 'maintain' OR ${t.targetWeightG} IS NOT NULL`,
    ),
  ],
);

export const petTarget = sqliteTable(
  "pet_target",
  {
    id: id(),
    petId: integer()
      .notNull()
      .references(() => pet.id),
    // App day, "YYYY-MM-DD".
    effectiveFrom: text().notNull(),
    kcalPerDay: integer().notNull(),
    source: text({ enum: TARGET_SOURCES }).notNull(),
  },
  (t) => [
    unique("pet_target_pet_day").on(t.petId, t.effectiveFrom),
    check(
      "pet_target_effective_from",
      sql`${t.effectiveFrom} GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'`,
    ),
    check("pet_target_kcal_per_day", sql`${t.kcalPerDay} > 0`),
    check("pet_target_source", oneOf(t.source, TARGET_SOURCES)),
  ],
);

export const weightEntry = sqliteTable(
  "weight_entry",
  {
    id: id(),
    petId: integer()
      .notNull()
      .references(() => pet.id),
    measuredAt: integer({ mode: "timestamp_ms" }).notNull(),
    weightG: integer().notNull(),
  },
  (t) => [
    index("weight_entry_pet_measured_at").on(t.petId, t.measuredAt),
    check("weight_entry_weight_g", sql`${t.weightG} > 0`),
  ],
);

export const food = sqliteTable(
  "food",
  {
    id: id(),
    brand: text(),
    name: text().notNull(),
    photoId: integer().references(() => image.id),
    // Null means the food suits any pet type.
    petTypeId: integer().references(() => petType.id),
    foodTypeId: integer()
      .notNull()
      .references(() => foodType.id),
    kcalPerKg: integer().notNull(),
    portionName: text(),
    portionG: integer(),
    stockUnit: text({ enum: STOCK_UNITS }).notNull().default("g"),
    // May go negative: logging is never blocked by a stale stock figure.
    stockG: integer().notNull().default(0),
    archivedAt: archivedAt(),
  },
  (t) => [
    check("food_kcal_per_kg", sql`${t.kcalPerKg} > 0`),
    check("food_portion_g", sql`${t.portionG} > 0`),
    check("food_stock_unit", oneOf(t.stockUnit, STOCK_UNITS)),
    check(
      "food_portion_unit_has_portion",
      sql`${t.stockUnit} <> 'portion' OR (${t.portionName} IS NOT NULL AND ${t.portionG} IS NOT NULL)`,
    ),
  ],
);

export const feedEntry = sqliteTable(
  "feed_entry",
  {
    id: id(),
    petId: integer()
      .notNull()
      .references(() => pet.id),
    foodId: integer()
      .notNull()
      .references(() => food.id),
    fedAt: integer({ mode: "timestamp_ms" }).notNull(),
    servedG: integer().notNull(),
    leftoverG: integer(),
    leftoverReturnedToStock: integer({ mode: "boolean" }).notNull(),
    // Snapshot of the food's value when the entry was logged.
    kcalPerKg: integer().notNull(),
  },
  (t) => [
    index("feed_entry_pet_fed_at").on(t.petId, t.fedAt),
    index("feed_entry_food_fed_at").on(t.foodId, t.fedAt),
    check("feed_entry_served_g", sql`${t.servedG} > 0`),
    check("feed_entry_leftover_g", sql`${t.leftoverG} BETWEEN 0 AND ${t.servedG}`),
    check("feed_entry_kcal_per_kg", sql`${t.kcalPerKg} > 0`),
  ],
);
