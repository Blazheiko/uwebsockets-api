/*
  Warnings:

  - You are about to drop the column `assignees` on the `projects` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `projects` DROP COLUMN `assignees`;

-- CreateTable
CREATE TABLE `project_assignees` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `label` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_assignees_project_id_user_id_key`(`project_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_assignees` ADD CONSTRAINT `project_assignees_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_assignees` ADD CONSTRAINT `project_assignees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
