-- AlterTable
ALTER TABLE `listening_items` ADD COLUMN `exercise_type` ENUM('multiple_choice', 'dictation', 'sentence_ordering') NOT NULL DEFAULT 'multiple_choice',
    ADD COLUMN `words_json` TEXT NULL;

-- CreateIndex
CREATE INDEX `idx_listening_items_type` ON `listening_items`(`exercise_type`);

