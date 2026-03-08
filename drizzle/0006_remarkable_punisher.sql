CREATE TABLE `review_step` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`step_order` integer NOT NULL,
	`title` text,
	`content` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `review_post`(`id`) ON UPDATE no action ON DELETE cascade
);
