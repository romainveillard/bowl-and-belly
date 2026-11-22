PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pet` (
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
	`archived_at` integer,
	FOREIGN KEY (`pet_type_id`) REFERENCES `pet_type`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`photo_id`) REFERENCES `image`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pet_birth_date" CHECK("__new_pet"."birth_date" GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
	CONSTRAINT "pet_birth_date_precision" CHECK("__new_pet"."birth_date_precision" IN ('exact', 'year', 'estimated')),
	CONSTRAINT "pet_activity_level" CHECK("__new_pet"."activity_level" IN ('inactive', 'normal', 'active')),
	CONSTRAINT "pet_goal" CHECK("__new_pet"."goal" IN ('maintain', 'lose', 'gain')),
	CONSTRAINT "pet_target_weight_g" CHECK("__new_pet"."target_weight_g" > 0),
	CONSTRAINT "pet_goal_has_target_weight" CHECK("__new_pet"."goal" = 'maintain' OR "__new_pet"."target_weight_g" IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_pet`("id", "name", "pet_type_id", "photo_id", "birth_date", "birth_date_precision", "neutered", "activity_level", "goal", "target_weight_g", "archived_at") SELECT "id", "name", "pet_type_id", "photo_id", "birth_date", "birth_date_precision", "neutered", "activity_level", "goal", "target_weight_g", "archived_at" FROM `pet`;--> statement-breakpoint
DROP TABLE `pet`;--> statement-breakpoint
ALTER TABLE `__new_pet` RENAME TO `pet`;--> statement-breakpoint
PRAGMA foreign_keys=ON;