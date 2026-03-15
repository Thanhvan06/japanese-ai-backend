-- CreateEnum
CREATE TABLE IF NOT EXISTS `ReadingExerciseType` (
  `value` ENUM('reading_comprehension', 'fill_in_the_blank') NOT NULL,
  PRIMARY KEY (`value`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_sets` (
    `set_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_reading_sets_level`(`jlpt_level`),
    INDEX `idx_reading_sets_published`(`is_published`),
    PRIMARY KEY (`set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_id` INTEGER NOT NULL,
    `exercise_type` ENUM('reading_comprehension', 'fill_in_the_blank') NOT NULL DEFAULT 'reading_comprehension',
    `passage` TEXT NULL,
    `question` TEXT NULL,
    `options_json` TEXT NULL,
    `blanks_json` TEXT NULL,
    `correct_index` INTEGER NULL DEFAULT 0,
    `explain_viet` TEXT NULL,

    INDEX `idx_reading_items_set`(`set_id`),
    INDEX `idx_reading_items_type`(`exercise_type`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_attempts` (
    `attempt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_reading_attempts_user`(`user_id`),
    INDEX `idx_reading_attempts_item`(`item_id`),
    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reading_items` ADD CONSTRAINT `fk_reading_items_set` FOREIGN KEY (`set_id`) REFERENCES `reading_sets`(`set_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_attempts` ADD CONSTRAINT `fk_reading_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_attempts` ADD CONSTRAINT `fk_reading_attempts_item` FOREIGN KEY (`item_id`) REFERENCES `reading_items`(`item_id`) ON DELETE CASCADE ON UPDATE CASCADE;

