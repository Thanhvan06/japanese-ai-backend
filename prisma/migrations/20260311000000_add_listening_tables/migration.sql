-- CreateTable
CREATE TABLE `listening_sets` (
    `set_id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_listening_sets_level`(`jlpt_level`),
    INDEX `idx_listening_sets_published`(`is_published`),
    PRIMARY KEY (`set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listening_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_id` INTEGER NOT NULL,
    `audio_url` VARCHAR(500) NULL,
    `options_json` TEXT NULL,
    `question` TEXT NULL,
    `transcript_jp` TEXT NULL,
    `explain_viet` TEXT NULL,
    `correct_index` INTEGER NULL DEFAULT 0,

    INDEX `idx_listening_items_set`(`set_id`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `listening_items` ADD CONSTRAINT `fk_listening_items_set` FOREIGN KEY (`set_id`) REFERENCES `listening_sets`(`set_id`) ON DELETE CASCADE ON UPDATE CASCADE;
