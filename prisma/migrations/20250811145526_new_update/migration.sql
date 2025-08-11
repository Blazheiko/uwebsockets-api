/*
  Warnings:

  - Added the required column `name` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `projects` ADD COLUMN `color` VARCHAR(50) NULL,
    ADD COLUMN `end_date` DATETIME(3) NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `name` VARCHAR(255) NOT NULL,
    ADD COLUMN `start_date` DATETIME(3) NULL,
    MODIFY `status` ENUM('planning', 'in_progress', 'on_hold', 'completed', 'archived') NOT NULL DEFAULT 'planning';
