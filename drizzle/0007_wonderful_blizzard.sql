CREATE TABLE `figma_checklist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`figma_id` integer NOT NULL,
	`content` text NOT NULL,
	`checked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`figma_id`) REFERENCES `figma_post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `figma_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text DEFAULT 'COMMON' NOT NULL,
	`title` text NOT NULL,
	`figma_url` text NOT NULL,
	`description` text,
	`author` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
