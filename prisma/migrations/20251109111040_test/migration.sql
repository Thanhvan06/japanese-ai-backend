-- CreateTable
CREATE TABLE `admins` (
    `admin_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('super_admin', 'content_manager') NOT NULL,
    `assigned_by` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `user_id`(`user_id`),
    INDEX `fk_admins_assigned_by`(`assigned_by`),
    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatmessages` (
    `message_id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `sender_type` ENUM('user', 'bot') NOT NULL,
    `content` TEXT NOT NULL,
    `sent_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_chatmsg_session_time`(`session_id`, `sent_at`),
    FULLTEXT INDEX `ftx_chatmsg_content`(`content`),
    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatsessions` (
    `session_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `topic` VARCHAR(255) NULL,

    INDEX `idx_chats_start`(`start_time`),
    INDEX `idx_chats_user`(`user_id`),
    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diaryentries` (
    `diary_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NULL,
    `content_jp` TEXT NOT NULL,
    `image_url` VARCHAR(255) NULL,
    `images` TEXT NULL,
    `nlp_analysis` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_diary_created`(`created_at`),
    INDEX `idx_diary_updated`(`updated_at`),
    INDEX `idx_diary_user`(`user_id`),
    FULLTEXT INDEX `ftx_diary_content`(`title`, `content_jp`),
    PRIMARY KEY (`diary_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fccards` (
    `card_id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_id` INTEGER NOT NULL,
    `side_jp` TEXT NOT NULL,
    `side_viet` TEXT NOT NULL,
    `image_url` VARCHAR(255) NULL,
    `mastery_level` TINYINT NOT NULL DEFAULT 1,

    INDEX `idx_fccards_set`(`set_id`),
    FULLTEXT INDEX `ftx_fccards_text`(`side_jp`, `side_viet`),
    PRIMARY KEY (`card_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcfolders` (
    `folder_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `folder_name` VARCHAR(255) NOT NULL,

    INDEX `idx_fcfolders_user`(`user_id`),
    PRIMARY KEY (`folder_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcsets` (
    `set_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `folder_id` INTEGER NULL,
    `set_name` VARCHAR(255) NOT NULL,
    `times_practiced` INTEGER NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_fcsets_created_at`(`created_at`),
    INDEX `idx_fcsets_folder`(`folder_id`),
    INDEX `idx_fcsets_times`(`times_practiced`),
    INDEX `idx_fcsets_user`(`user_id`),
    PRIMARY KEY (`set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grammar` (
    `grammar_id` INTEGER NOT NULL AUTO_INCREMENT,
    `grammar_structure` VARCHAR(255) NOT NULL,
    `explanation_viet` TEXT NOT NULL,
    `example_jp` TEXT NOT NULL,
    `example_viet` TEXT NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_grammar_level`(`jlpt_level`),
    INDEX `idx_grammar_published`(`is_published`),
    FULLTEXT INDEX `ftx_grammar_text`(`grammar_structure`, `explanation_viet`, `example_jp`),
    PRIMARY KEY (`grammar_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grammar_rules` (
    `grammar_rule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule_code` VARCHAR(50) NOT NULL,
    `rule_name_jp` VARCHAR(255) NOT NULL,
    `rule_name_viet` VARCHAR(255) NOT NULL,
    `pattern` VARCHAR(255) NOT NULL,
    `error_pattern` TEXT NULL,
    `correct_pattern` TEXT NOT NULL,
    `explanation_viet` TEXT NOT NULL,
    `explanation_jp` TEXT NOT NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `category` ENUM('PARTICLE', 'POLITE_FORM', 'VERB_CONJUGATION', 'TENSE', 'PASSIVE', 'CAUSATIVE', 'OTHER') NOT NULL,
    `frequency` INTEGER NOT NULL,

    INDEX `idx_grammar_rules_level`(`jlpt_level`),
    INDEX `idx_grammar_rules_category`(`category`),
    INDEX `idx_grammar_rules_frequency`(`frequency`),
    PRIMARY KEY (`grammar_rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `systemstats` (
    `stat_id` INTEGER NOT NULL AUTO_INCREMENT,
    `stat_date` DATE NOT NULL,
    `total_users` INTEGER NOT NULL,
    `new_users_daily` INTEGER NOT NULL,
    `active_users_daily` INTEGER NOT NULL,
    `total_sets_created` INTEGER NOT NULL,
    `daily_diary_entries` INTEGER NOT NULL,
    `total_published_vocab` INTEGER NOT NULL,
    `total_published_grammar` INTEGER NOT NULL,

    UNIQUE INDEX `stat_date`(`stat_date`),
    PRIMARY KEY (`stat_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usergrammarstatus` (
    `user_id` INTEGER NOT NULL,
    `grammar_id` INTEGER NOT NULL,
    `mastery_level` TINYINT NOT NULL DEFAULT 1,
    `last_reviewed` TIMESTAMP(0) NULL,

    INDEX `fk_ugs_grammar`(`grammar_id`),
    INDEX `idx_ugs_last_reviewed`(`last_reviewed`),
    PRIMARY KEY (`user_id`, `grammar_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` CHAR(60) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `avatar_url` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `email`(`email`),
    INDEX `idx_users_created_at`(`created_at`),
    INDEX `idx_users_is_active`(`is_active`),
    INDEX `idx_users_last_login`(`last_login`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `uservocabstatus` (
    `user_id` INTEGER NOT NULL,
    `vocab_id` INTEGER NOT NULL,
    `mastery_level` TINYINT NOT NULL DEFAULT 1,
    `last_reviewed` TIMESTAMP(0) NULL,

    INDEX `fk_uvs_vocab`(`vocab_id`),
    INDEX `idx_uvs_last_reviewed`(`last_reviewed`),
    PRIMARY KEY (`user_id`, `vocab_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabitems` (
    `vocab_id` INTEGER NOT NULL AUTO_INCREMENT,
    `word_kanji` VARCHAR(100) NOT NULL,
    `word_kana` VARCHAR(100) NOT NULL,
    `word_viet` TEXT NOT NULL,
    `example_jp` TEXT NULL,
    `example_viet` TEXT NULL,
    `image_url` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_vocab_level`(`jlpt_level`),
    INDEX `idx_vocab_published`(`is_published`),
    FULLTEXT INDEX `ftx_vocab_text`(`word_kanji`, `word_kana`, `word_viet`, `example_jp`, `example_viet`),
    PRIMARY KEY (`vocab_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `fk_admins_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `fk_admins_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatmessages` ADD CONSTRAINT `fk_chatmsg_session` FOREIGN KEY (`session_id`) REFERENCES `chatsessions`(`session_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatsessions` ADD CONSTRAINT `fk_chats_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `diaryentries` ADD CONSTRAINT `fk_diary_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fccards` ADD CONSTRAINT `fk_fccards_set` FOREIGN KEY (`set_id`) REFERENCES `fcsets`(`set_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcfolders` ADD CONSTRAINT `fk_fcfolders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcsets` ADD CONSTRAINT `fk_fcsets_folder` FOREIGN KEY (`folder_id`) REFERENCES `fcfolders`(`folder_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcsets` ADD CONSTRAINT `fk_fcsets_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usergrammarstatus` ADD CONSTRAINT `fk_ugs_grammar` FOREIGN KEY (`grammar_id`) REFERENCES `grammar`(`grammar_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usergrammarstatus` ADD CONSTRAINT `fk_ugs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uservocabstatus` ADD CONSTRAINT `fk_uvs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uservocabstatus` ADD CONSTRAINT `fk_uvs_vocab` FOREIGN KEY (`vocab_id`) REFERENCES `vocabitems`(`vocab_id`) ON DELETE CASCADE ON UPDATE CASCADE;