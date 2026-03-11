-- CreateTable
CREATE TABLE `speaking_phrases` (
    `phrase_id` INTEGER NOT NULL AUTO_INCREMENT,
    `jp` TEXT NOT NULL,
    `romaji` TEXT NULL,
    `vi` TEXT NOT NULL,
    `topic` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_speaking_jlpt_level`(`jlpt_level`),
    INDEX `idx_speaking_published`(`is_published`),
    FULLTEXT INDEX `ftx_speaking_text`(`jp`, `vi`),
    PRIMARY KEY (`phrase_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

