/*
  Warnings:

  - The primary key for the `calendar` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `contact_list` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `invitations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `notes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `notes_photos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `color` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `projects` table. All the data in the column will be lost.
  - The primary key for the `tasks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `title` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `calendar` DROP FOREIGN KEY `calendar_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `contact_list` DROP FOREIGN KEY `contact_list_contact_id_fkey`;

-- DropForeignKey
ALTER TABLE `contact_list` DROP FOREIGN KEY `contact_list_last_message_id_fkey`;

-- DropForeignKey
ALTER TABLE `contact_list` DROP FOREIGN KEY `contact_list_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `invitations` DROP FOREIGN KEY `invitations_invited_id_fkey`;

-- DropForeignKey
ALTER TABLE `invitations` DROP FOREIGN KEY `invitations_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_receiver_id_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_sender_id_fkey`;

-- DropForeignKey
ALTER TABLE `notes` DROP FOREIGN KEY `notes_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `notes_photos` DROP FOREIGN KEY `notes_photos_note_id_fkey`;

-- DropForeignKey
ALTER TABLE `projects` DROP FOREIGN KEY `projects_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_parent_task_id_fkey`;

-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_user_id_fkey`;

-- DropIndex
DROP INDEX `calendar_user_id_fkey` ON `calendar`;

-- DropIndex
DROP INDEX `contact_list_contact_id_fkey` ON `contact_list`;

-- DropIndex
DROP INDEX `contact_list_last_message_id_key` ON `contact_list`;

-- DropIndex
DROP INDEX `invitations_invited_id_fkey` ON `invitations`;

-- DropIndex
DROP INDEX `invitations_user_id_fkey` ON `invitations`;

-- DropIndex
DROP INDEX `messages_receiver_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `messages_sender_id_fkey` ON `messages`;

-- DropIndex
DROP INDEX `notes_user_id_fkey` ON `notes`;

-- DropIndex
DROP INDEX `notes_photos_note_id_fkey` ON `notes_photos`;

-- DropIndex
DROP INDEX `projects_user_id_fkey` ON `projects`;

-- DropIndex
DROP INDEX `tasks_parent_task_id_fkey` ON `tasks`;

-- DropIndex
DROP INDEX `tasks_project_id_fkey` ON `tasks`;

-- DropIndex
DROP INDEX `tasks_user_id_fkey` ON `tasks`;

-- AlterTable
ALTER TABLE `calendar` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `contact_list` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    MODIFY `contact_id` BIGINT NOT NULL,
    MODIFY `last_message_id` BIGINT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `invitations` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    MODIFY `invited_id` BIGINT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `messages` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `sender_id` BIGINT NOT NULL,
    MODIFY `receiver_id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notes` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notes_photos` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `note_id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `projects` DROP PRIMARY KEY,
    DROP COLUMN `color`,
    DROP COLUMN `end_date`,
    DROP COLUMN `is_active`,
    DROP COLUMN `name`,
    DROP COLUMN `start_date`,
    ADD COLUMN `assignees` JSON NULL,
    ADD COLUMN `due_date` DATE NULL,
    ADD COLUMN `priority` ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    ADD COLUMN `progress` SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN `status` ENUM('planning', 'in_progress', 'on_hold', 'completed') NOT NULL DEFAULT 'planning',
    ADD COLUMN `tags` JSON NULL,
    ADD COLUMN `title` VARCHAR(255) NOT NULL,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `tasks` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    MODIFY `user_id` BIGINT NOT NULL,
    MODIFY `project_id` BIGINT NULL,
    MODIFY `parent_task_id` BIGINT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` BIGINT NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateTable
CREATE TABLE `project_tags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `tag` VARCHAR(100) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `project_tags_project_id_tag_key`(`project_id`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contact_list` ADD CONSTRAINT `contact_list_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_list` ADD CONSTRAINT `contact_list_contact_id_fkey` FOREIGN KEY (`contact_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_list` ADD CONSTRAINT `contact_list_last_message_id_fkey` FOREIGN KEY (`last_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invited_id_fkey` FOREIGN KEY (`invited_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes_photos` ADD CONSTRAINT `notes_photos_note_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `calendar` ADD CONSTRAINT `calendar_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tags` ADD CONSTRAINT `project_tags_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
