CREATE TABLE `ai_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`page_id` text,
	`payload` text NOT NULL,
	`confidence` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE no action
);
