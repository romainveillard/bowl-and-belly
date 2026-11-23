PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`time_zone` text NOT NULL,
	`day_starts_at` text DEFAULT '00:00' NOT NULL,
	`backup_enabled` integer DEFAULT false NOT NULL,
	`backup_frequency` text DEFAULT 'daily' NOT NULL,
	`backup_weekday` integer,
	`backup_time` text DEFAULT '03:00' NOT NULL,
	`backup_keep` integer DEFAULT 7 NOT NULL,
	`backup_failed_at` integer,
	`backup_error` text,
	CONSTRAINT "settings_single_row" CHECK("__new_settings"."id" = 1),
	CONSTRAINT "settings_day_starts_at" CHECK("__new_settings"."day_starts_at" GLOB '[0-2][0-9]:[0-5][0-9]' AND "__new_settings"."day_starts_at" < '24'),
	CONSTRAINT "settings_backup_frequency" CHECK("__new_settings"."backup_frequency" IN ('daily', 'weekly')),
	CONSTRAINT "settings_backup_weekday" CHECK("__new_settings"."backup_weekday" BETWEEN 1 AND 7),
	CONSTRAINT "settings_weekly_has_weekday" CHECK("__new_settings"."backup_frequency" <> 'weekly' OR "__new_settings"."backup_weekday" IS NOT NULL),
	CONSTRAINT "settings_backup_time" CHECK("__new_settings"."backup_time" GLOB '[0-2][0-9]:[0-5][0-9]' AND "__new_settings"."backup_time" < '24'),
	CONSTRAINT "settings_backup_keep" CHECK("__new_settings"."backup_keep" >= 1),
	CONSTRAINT "settings_backup_error" CHECK("__new_settings"."backup_error" IN ('disk_full', 'cannot_write', 'unknown'))
);
--> statement-breakpoint
INSERT INTO `__new_settings`("id", "time_zone", "day_starts_at", "backup_enabled", "backup_frequency", "backup_weekday", "backup_time", "backup_keep", "backup_failed_at", "backup_error") SELECT "id", "time_zone", "day_starts_at", "backup_enabled", "backup_frequency", "backup_weekday", "backup_time", "backup_keep", "backup_failed_at", "backup_error" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;