CREATE TABLE `feed_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` integer NOT NULL,
	`food_id` integer NOT NULL,
	`fed_at` integer NOT NULL,
	`served_g` integer NOT NULL,
	`leftover_g` integer,
	`leftover_returned_to_stock` integer NOT NULL,
	`kcal_per_kg` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_id`) REFERENCES `food`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "feed_entry_served_g" CHECK("feed_entry"."served_g" > 0),
	CONSTRAINT "feed_entry_leftover_g" CHECK("feed_entry"."leftover_g" BETWEEN 0 AND "feed_entry"."served_g"),
	CONSTRAINT "feed_entry_kcal_per_kg" CHECK("feed_entry"."kcal_per_kg" > 0)
);
--> statement-breakpoint
CREATE INDEX `feed_entry_pet_fed_at` ON `feed_entry` (`pet_id`,`fed_at`);--> statement-breakpoint
CREATE INDEX `feed_entry_food_fed_at` ON `feed_entry` (`food_id`,`fed_at`);--> statement-breakpoint
CREATE TABLE `food` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand` text,
	`name` text NOT NULL,
	`photo_id` integer,
	`pet_type_id` integer,
	`food_type_id` integer NOT NULL,
	`kcal_per_kg` integer NOT NULL,
	`portion_name` text,
	`portion_g` integer,
	`stock_unit` text DEFAULT 'g' NOT NULL,
	`stock_g` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`photo_id`) REFERENCES `image`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_type_id`) REFERENCES `pet_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_type_id`) REFERENCES `food_type`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "food_kcal_per_kg" CHECK("food"."kcal_per_kg" > 0),
	CONSTRAINT "food_portion_g" CHECK("food"."portion_g" > 0),
	CONSTRAINT "food_stock_unit" CHECK("food"."stock_unit" IN ('g', 'portion')),
	CONSTRAINT "food_portion_unit_has_portion" CHECK("food"."stock_unit" <> 'portion' OR ("food"."portion_name" IS NOT NULL AND "food"."portion_g" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `food_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`system_key` text,
	`leftover_returns_to_stock` integer NOT NULL,
	`archived_at` integer,
	CONSTRAINT "food_type_system_key" CHECK("food_type"."system_key" IN ('wet', 'dry')),
	CONSTRAINT "food_type_labelled" CHECK("food_type"."system_key" IS NOT NULL OR "food_type"."name" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_type_system_key_unique` ON `food_type` (`system_key`);--> statement-breakpoint
CREATE TABLE `image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` blob NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pet` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`pet_type_id` integer NOT NULL,
	`photo_id` integer,
	`birth_date` text NOT NULL,
	`birth_date_precision` text NOT NULL,
	`neutered` integer NOT NULL,
	`activity_level` text NOT NULL,
	`goal` text NOT NULL,
	`target_weight_g` integer,
	`weight_decimals` integer DEFAULT 1 NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`pet_type_id`) REFERENCES `pet_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_id`) REFERENCES `image`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pet_birth_date" CHECK("pet"."birth_date" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "pet_birth_date_precision" CHECK("pet"."birth_date_precision" IN ('exact', 'year', 'estimated')),
	CONSTRAINT "pet_activity_level" CHECK("pet"."activity_level" IN ('inactive', 'normal', 'active')),
	CONSTRAINT "pet_goal" CHECK("pet"."goal" IN ('maintain', 'lose', 'gain')),
	CONSTRAINT "pet_target_weight_g" CHECK("pet"."target_weight_g" > 0),
	CONSTRAINT "pet_goal_has_target_weight" CHECK("pet"."goal" = 'maintain' OR "pet"."target_weight_g" IS NOT NULL),
	CONSTRAINT "pet_weight_decimals" CHECK("pet"."weight_decimals" IN (1, 2))
);
--> statement-breakpoint
CREATE TABLE `pet_target` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` integer NOT NULL,
	`effective_from` text NOT NULL,
	`kcal_per_day` integer NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pet_target_effective_from" CHECK("pet_target"."effective_from" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "pet_target_kcal_per_day" CHECK("pet_target"."kcal_per_day" > 0),
	CONSTRAINT "pet_target_source" CHECK("pet_target"."source" IN ('calculated', 'manual'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pet_target_pet_day` ON `pet_target` (`pet_id`,`effective_from`);--> statement-breakpoint
CREATE TABLE `pet_type` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text,
	`system_key` text,
	`archived_at` integer,
	CONSTRAINT "pet_type_system_key" CHECK("pet_type"."system_key" IN ('cat', 'dog')),
	CONSTRAINT "pet_type_labelled" CHECK("pet_type"."system_key" IS NOT NULL OR "pet_type"."name" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pet_type_system_key_unique` ON `pet_type` (`system_key`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`time_zone` text NOT NULL,
	`day_starts_at` text DEFAULT '00:00' NOT NULL,
	`backup_enabled` integer DEFAULT false NOT NULL,
	`backup_frequency` text DEFAULT 'daily' NOT NULL,
	`backup_weekday` integer,
	`backup_time` text DEFAULT '03:00' NOT NULL,
	`backup_keep` integer DEFAULT 7 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_day_starts_at" CHECK("settings"."day_starts_at" GLOB '[0-2][0-9]:[0-5][0-9]' AND "settings"."day_starts_at" < '24'),
	CONSTRAINT "settings_backup_frequency" CHECK("settings"."backup_frequency" IN ('daily', 'weekly')),
	CONSTRAINT "settings_backup_weekday" CHECK("settings"."backup_weekday" BETWEEN 1 AND 7),
	CONSTRAINT "settings_weekly_has_weekday" CHECK("settings"."backup_frequency" <> 'weekly' OR "settings"."backup_weekday" IS NOT NULL),
	CONSTRAINT "settings_backup_time" CHECK("settings"."backup_time" GLOB '[0-2][0-9]:[0-5][0-9]' AND "settings"."backup_time" < '24'),
	CONSTRAINT "settings_backup_keep" CHECK("settings"."backup_keep" >= 1)
);
--> statement-breakpoint
CREATE TABLE `weight_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pet_id` integer NOT NULL,
	`measured_at` integer NOT NULL,
	`weight_g` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weight_entry_weight_g" CHECK("weight_entry"."weight_g" > 0)
);
--> statement-breakpoint
CREATE INDEX `weight_entry_pet_measured_at` ON `weight_entry` (`pet_id`,`measured_at`);