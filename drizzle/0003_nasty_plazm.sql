CREATE TABLE `issue_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_id` integer NOT NULL,
	`url` text NOT NULL,
	`filename` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`issue_id`) REFERENCES `issue_post`(`id`) ON UPDATE no action ON DELETE cascade
);
