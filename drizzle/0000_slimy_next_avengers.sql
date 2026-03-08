CREATE TABLE `code_detail` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_cd` text NOT NULL,
	`detail_cd` text NOT NULL,
	`detail_nm` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`use_yn` text DEFAULT 'Y' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`group_cd`) REFERENCES `code_group`(`group_cd`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `code_group` (
	`group_cd` text PRIMARY KEY NOT NULL,
	`group_nm` text NOT NULL,
	`description` text,
	`use_yn` text DEFAULT 'Y' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cond_corner` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_id` text NOT NULL,
	`cond_shop_id` text NOT NULL,
	`cond_site_id` text NOT NULL,
	`corner_id` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cond_shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cond_site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`corner_id`) REFERENCES `corners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cond_menu` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_id` text NOT NULL,
	`cond_shop_id` text NOT NULL,
	`cond_site_id` text NOT NULL,
	`cond_corner_id` text NOT NULL,
	`menu_id` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cond_shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cond_site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cond_corner_id`) REFERENCES `corners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cond_shop` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_id` text NOT NULL,
	`shop_id` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cond_site` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_id` text NOT NULL,
	`cond_shop_id` text NOT NULL,
	`site_id` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cond_shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cond_time` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coupon_id` text NOT NULL,
	`time_cond_cd` text NOT NULL,
	`time_cond_seq` integer DEFAULT 0 NOT NULL,
	`start_tm` text,
	`end_tm` text,
	`day_of_week` text,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `corners` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`shop_id` text NOT NULL,
	`site_id` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coupon_issuance` (
	`id` text PRIMARY KEY NOT NULL,
	`coupon_id` text NOT NULL,
	`issue_title` text,
	`issue_type` text DEFAULT 'FIRST_COME' NOT NULL,
	`issue_qty` integer NOT NULL,
	`valid_start_date` text,
	`valid_end_date` text,
	`issue_dt` text NOT NULL,
	`memo` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coupon_issued` (
	`id` text PRIMARY KEY NOT NULL,
	`issuance_id` text NOT NULL,
	`coupon_id` text NOT NULL,
	`status` text DEFAULT 'UNUSED' NOT NULL,
	`used_at` text,
	`used_shop_id` text,
	`used_amount` integer,
	FOREIGN KEY (`issuance_id`) REFERENCES `coupon_issuance`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`coupon_id`) REFERENCES `coupon_master`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `coupon_master` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`discount_type` text DEFAULT 'RATE' NOT NULL,
	`discount_value` integer DEFAULT 0 NOT NULL,
	`start_date` text,
	`end_date` text,
	`term_type_cd` text DEFAULT '00' NOT NULL,
	`apprv_cd` text DEFAULT 'C' NOT NULL,
	`apprv_dt` text,
	`use_yn` text DEFAULT 'Y' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`shop_id` text NOT NULL,
	`site_id` text NOT NULL,
	`corner_id` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`corner_id`) REFERENCES `corners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `review_comment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`content` text NOT NULL,
	`author` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `review_post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `review_post` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text DEFAULT 'COMMON' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`author` text DEFAULT 'admin' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`shop_id` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);
