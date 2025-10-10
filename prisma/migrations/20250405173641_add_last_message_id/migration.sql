/*
  Warnings:

  - A unique constraint covering the columns `[last_message_id]` on the table `contact_list` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `contact_list` ADD COLUMN `last_message_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `contact_list_last_message_id_key` ON `contact_list`(`last_message_id`);

-- AddForeignKey
ALTER TABLE `contact_list` ADD CONSTRAINT `contact_list_last_message_id_fkey` FOREIGN KEY (`last_message_id`) REFERENCES `messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
