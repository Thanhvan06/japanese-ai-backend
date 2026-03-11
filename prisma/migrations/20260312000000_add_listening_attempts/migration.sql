-- CreateTable
CREATE TABLE `listening_attempts` (
    `attempt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_listening_attempts_user`(`user_id`),
    INDEX `idx_listening_attempts_item`(`item_id`),
    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `listening_attempts` ADD CONSTRAINT `fk_listening_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listening_attempts` ADD CONSTRAINT `fk_listening_attempts_item` FOREIGN KEY (`item_id`) REFERENCES `listening_items`(`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;
