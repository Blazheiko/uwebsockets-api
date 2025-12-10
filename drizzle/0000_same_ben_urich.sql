CREATE TABLE `calendar` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`start_time` datetime NOT NULL,
	`end_time` datetime NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `calendar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contact_list` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`contact_id` bigint unsigned NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`unread_count` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	`rename` varchar(100),
	`last_message_id` bigint unsigned,
	CONSTRAINT `contact_list_id` PRIMARY KEY(`id`),
	CONSTRAINT `contact_list_user_id_contact_id_key` UNIQUE(`user_id`,`contact_id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`token` varchar(255) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`invited_id` bigint unsigned,
	`is_used` boolean NOT NULL DEFAULT false,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`name` varchar(100) NOT NULL,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`sender_id` bigint unsigned NOT NULL,
	`receiver_id` bigint unsigned NOT NULL,
	`type` enum('TEXT','IMAGE','VIDEO','AUDIO') NOT NULL DEFAULT 'TEXT',
	`content` text NOT NULL,
	`src` varchar(500),
	`is_read` boolean NOT NULL DEFAULT false,
	`calendar_id` bigint unsigned,
	`task_id` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes_photos` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`note_id` bigint unsigned NOT NULL,
	`src` varchar(500) NOT NULL,
	`filename` varchar(255),
	`size` int,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `notes_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_assignees` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`project_id` bigint unsigned NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`label` varchar(255),
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `project_assignees_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_assignees_project_id_user_id_key` UNIQUE(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `project_tags` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`project_id` bigint unsigned NOT NULL,
	`tag` varchar(100) NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `project_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_tags_project_id_tag_key` UNIQUE(`project_id`,`tag`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`color` varchar(50),
	`is_active` boolean NOT NULL DEFAULT true,
	`start_date` datetime,
	`end_date` datetime,
	`user_id` bigint unsigned NOT NULL,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`due_date` date,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`progress` smallint NOT NULL DEFAULT 0,
	`status` enum('planning','in_progress','on_hold','completed','archived') NOT NULL DEFAULT 'planning',
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_notifications_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`subscription_id` bigint unsigned,
	`message_title` varchar(255),
	`message_body` text,
	`message_data` json,
	`sent_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`status` enum('SENT','FAILED','PENDING'),
	`error_message` text,
	`response_data` json,
	CONSTRAINT `push_notifications_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`endpoint` varchar(500) NOT NULL,
	`p256dh_key` text NOT NULL,
	`auth_key` text NOT NULL,
	`user_agent` text,
	`ip_address` varchar(45),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`last_used_at` datetime,
	`device_type` varchar(50),
	`browser_name` varchar(100),
	`browser_version` varchar(50),
	`os_name` varchar(100),
	`os_version` varchar(50),
	`notification_types` json,
	`timezone` varchar(50),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`user_id` bigint unsigned NOT NULL,
	`project_id` bigint unsigned,
	`status` enum('TODO','IN_PROGRESS','ON_HOLD','COMPLETED','CANCELLED') NOT NULL DEFAULT 'TODO',
	`priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
	`progress` int NOT NULL DEFAULT 0,
	`is_completed` boolean NOT NULL DEFAULT false,
	`tags` varchar(500),
	`due_date` datetime,
	`start_date` datetime,
	`estimated_hours` float,
	`actual_hours` float,
	`parent_task_id` bigint unsigned,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.343',
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`phone` varchar(20),
	`isAdmin` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	`updated_at` datetime NOT NULL DEFAULT '2025-12-10 10:45:50.342',
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE INDEX `calendar_user_id_fkey` ON `calendar` (`user_id`);--> statement-breakpoint
CREATE INDEX `contact_list_contact_id_fkey` ON `contact_list` (`contact_id`);--> statement-breakpoint
CREATE INDEX `contact_list_last_message_id_fkey` ON `contact_list` (`last_message_id`);--> statement-breakpoint
CREATE INDEX `invitations_invited_id_fkey` ON `invitations` (`invited_id`);--> statement-breakpoint
CREATE INDEX `invitations_user_id_fkey` ON `invitations` (`user_id`);--> statement-breakpoint
CREATE INDEX `messages_calendar_id_fkey` ON `messages` (`calendar_id`);--> statement-breakpoint
CREATE INDEX `messages_receiver_id_fkey` ON `messages` (`receiver_id`);--> statement-breakpoint
CREATE INDEX `messages_sender_id_fkey` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_task_id_fkey` ON `messages` (`task_id`);--> statement-breakpoint
CREATE INDEX `notes_user_id_fkey` ON `notes` (`user_id`);--> statement-breakpoint
CREATE INDEX `notes_photos_note_id_fkey` ON `notes_photos` (`note_id`);--> statement-breakpoint
CREATE INDEX `project_assignees_user_id_fkey` ON `project_assignees` (`user_id`);--> statement-breakpoint
CREATE INDEX `projects_user_id_fkey` ON `projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_notifications_log_user_id_fkey` ON `push_notifications_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `push_notifications_log_subscription_id_fkey` ON `push_notifications_log` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_fkey` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `tasks_parent_task_id_fkey` ON `tasks` (`parent_task_id`);--> statement-breakpoint
CREATE INDEX `tasks_project_id_fkey` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_user_id_fkey` ON `tasks` (`user_id`);