-- AlterTable
ALTER TABLE `messages` ADD COLUMN `calendar_id` BIGINT NULL,
    ADD COLUMN `task_id` BIGINT NULL;

-- CreateIndex
CREATE INDEX `messages_calendar_id_fkey` ON `messages`(`calendar_id`);

-- CreateIndex
CREATE INDEX `messages_task_id_fkey` ON `messages`(`task_id`);

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_calendar_id_fkey` FOREIGN KEY (`calendar_id`) REFERENCES `calendar`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
