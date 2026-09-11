CREATE TABLE `answers` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL,
	`feedback` text,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `answers_dataset` ON `answers` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`filename` text NOT NULL,
	`created_at` text NOT NULL,
	`count` integer NOT NULL,
	`rejected` integer NOT NULL,
	`duplicates` integer NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `datasets_owner` ON `datasets` (`owner`);--> statement-breakpoint
CREATE TABLE `evaluations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created_at` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `evaluations_owner` ON `evaluations` (`owner`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`payload` text NOT NULL,
	`embedding` text,
	`embedding_model` text,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_dataset` ON `reviews` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`encrypted_key` text,
	`model` text DEFAULT 'gpt-4.1-mini' NOT NULL,
	`embedding_model` text DEFAULT 'text-embedding-3-small' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL
);
