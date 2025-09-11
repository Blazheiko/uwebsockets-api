/*
  Warnings:

  - You are about to drop the column `tags` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `projects` DROP COLUMN `tags`;

-- CreateTable
CREATE TABLE `push_subscriptions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `p256dh_key` TEXT NOT NULL,
    `auth_key` TEXT NOT NULL,
    `user_agent` TEXT NULL,
    `ip_address` VARCHAR(45) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_used_at` DATETIME(3) NULL,
    `device_type` VARCHAR(50) NULL,
    `browser_name` VARCHAR(100) NULL,
    `browser_version` VARCHAR(50) NULL,
    `os_name` VARCHAR(100) NULL,
    `os_version` VARCHAR(50) NULL,
    `notification_types` JSON NULL,
    `timezone` VARCHAR(50) NULL,

    UNIQUE INDEX `push_subscriptions_endpoint_key`(`endpoint`),
    INDEX `push_subscriptions_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `push_notifications_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `subscription_id` BIGINT NULL,
    `message_title` VARCHAR(255) NULL,
    `message_body` TEXT NULL,
    `message_data` JSON NULL,
    `sent_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('SENT', 'FAILED', 'PENDING') NULL,
    `error_message` TEXT NULL,
    `response_data` JSON NULL,

    INDEX `push_notifications_log_user_id_fkey`(`user_id`),
    INDEX `push_notifications_log_subscription_id_fkey`(`subscription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_notifications_log` ADD CONSTRAINT `push_notifications_log_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `push_notifications_log` ADD CONSTRAINT `push_notifications_log_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
