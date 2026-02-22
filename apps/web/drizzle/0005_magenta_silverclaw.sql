CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_state` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`goal` text,
	`open_tasks_count` integer DEFAULT 0 NOT NULL,
	`completed_tasks_count` integer DEFAULT 0 NOT NULL,
	`blockers` text,
	`health_score` integer,
	`last_activity` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_state_project_id_unique` ON `project_state` (`project_id`);