-- AlterTable
ALTER TABLE `speaking_phrases`
    ADD COLUMN `audio_url` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `speaking_attempts` (
    `attempt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `phrase_id` INTEGER NOT NULL,
    `audio_url` VARCHAR(500) NOT NULL,
    `transcribed_text` TEXT NOT NULL,
    `accuracy_score` DOUBLE NULL,
    `details_json` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_speaking_attempts_user`(`user_id`),
    INDEX `idx_speaking_attempts_phrase`(`phrase_id`),
    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `speaking_attempts` ADD CONSTRAINT `fk_speaking_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `speaking_attempts` ADD CONSTRAINT `fk_speaking_attempts_phrase` FOREIGN KEY (`phrase_id`) REFERENCES `speaking_phrases`(`phrase_id`) ON DELETE CASCADE ON UPDATE CASCADE;

