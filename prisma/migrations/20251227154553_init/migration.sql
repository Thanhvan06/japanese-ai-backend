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
CREATE TABLE `admin_audit` (
    `audit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_user_id` INTEGER NOT NULL,
    `target_user_id` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_audit_admin`(`admin_user_id`),
    INDEX `idx_audit_target`(`target_user_id`),
    PRIMARY KEY (`audit_id`)
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
    `image_url` TEXT NULL,
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
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_fcsets_created_at`(`created_at`),
    INDEX `idx_fcsets_folder`(`folder_id`),
    INDEX `idx_fcsets_user`(`user_id`),
    PRIMARY KEY (`set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flashcard_sessions` (
    `session_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `set_id` INTEGER NOT NULL,
    `remembered_count` INTEGER NOT NULL,
    `not_remembered_count` INTEGER NOT NULL,
    `completed_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_flashcard_sessions_set`(`set_id`),
    INDEX `idx_flashcard_last`(`user_id`, `set_id`, `completed_at`),
    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gram_exercise_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `option_id` INTEGER NOT NULL,
    `exercise_id` INTEGER NOT NULL,
    `option_text` VARCHAR(255) NOT NULL,
    `option_role` ENUM('choice', 'arrange_word') NOT NULL DEFAULT 'choice',
    `is_correct` BOOLEAN NULL DEFAULT false,
    `sort_order` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gram_exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exercise_id` INTEGER NOT NULL,
    `grammar_id` INTEGER NOT NULL,
    `question_type` ENUM('multiple_choice', 'sentence_arrangement') NOT NULL,
    `question_text` TEXT NOT NULL,
    `question_suffix` TEXT NULL,
    `explanation_note` TEXT NULL,
    `difficulty_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
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

    INDEX `idx_grammar_rules_category`(`category`),
    INDEX `idx_grammar_rules_frequency`(`frequency`),
    INDEX `idx_grammar_rules_level`(`jlpt_level`),
    PRIMARY KEY (`grammar_rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_plan_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `study_date` DATE NOT NULL,
    `required_vocab_count` INTEGER NOT NULL,

    UNIQUE INDEX `uq_plan_date`(`plan_id`, `study_date`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_plans` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `target_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `words_per_day` INTEGER NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_study_plans_user`(`user_id`),
    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `study_sessions` (
    `session_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `source` ENUM('timer', 'todo', 'flashcard') NOT NULL,
    `source_id` INTEGER NULL,
    `start_time` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `end_time` TIMESTAMP(0) NULL,
    `duration_seconds` INTEGER NULL,

    INDEX `idx_study_user_time`(`user_id`, `start_time`),
    PRIMARY KEY (`session_id`)
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
CREATE TABLE `todos` (
    `todo_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `expected_duration` INTEGER NULL,
    `status` ENUM('pending', 'in_progress', 'done') NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_todos_user`(`user_id`),
    PRIMARY KEY (`todo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `user_id` INTEGER NOT NULL,
    `theme_config` JSON NOT NULL,
    `todo_config` JSON NOT NULL,
    `playlist_config` JSON NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`user_id`)
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
    `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    `avatar_url` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `reset_token` VARCHAR(255) NULL,
    `reset_token_expires` DATETIME(0) NULL,

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
CREATE TABLE `topics` (
    `topic_id` INTEGER NOT NULL AUTO_INCREMENT,
    `topic_name` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `topics_topic_name_key`(`topic_name`),
    PRIMARY KEY (`topic_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vocabitems` (
    `vocab_id` INTEGER NOT NULL AUTO_INCREMENT,
    `word` VARCHAR(100) NOT NULL,
    `meaning` VARCHAR(100) NOT NULL,
    `furigana` TEXT NOT NULL,
    `image_url` VARCHAR(255) NULL,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `topic_id` INTEGER NULL,

    INDEX `idx_vocab_level`(`jlpt_level`),
    INDEX `idx_vocab_published`(`is_published`),
    INDEX `idx_vocab_topic`(`topic_id`),
    FULLTEXT INDEX `ftx_vocab_text`(`word`, `meaning`, `furigana`),
    PRIMARY KEY (`vocab_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listening_attempts` (
    `attempt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `set_id` INTEGER NOT NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `details_json` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `listening_attempts_set_id_idx`(`set_id`),
    INDEX `listening_attempts_user_id_idx`(`user_id`),
    PRIMARY KEY (`attempt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listening_items` (
    `item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `set_id` INTEGER NOT NULL,
    `audio_url` VARCHAR(255) NOT NULL,
    `question` TEXT NOT NULL,
    `options_json` LONGTEXT NOT NULL,
    `correct_index` INTEGER NOT NULL,
    `transcript_jp` LONGTEXT NULL,
    `explain_viet` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `listening_items_set_id_idx`(`set_id`),
    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listening_sets` (
    `set_id` INTEGER NOT NULL AUTO_INCREMENT,
    `jlpt_level` ENUM('N5', 'N4', 'N3', 'N2', 'N1') NOT NULL,
    `type` ENUM('point', 'response') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `is_published` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`set_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `fk_admins_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admins` ADD CONSTRAINT `fk_admins_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `admin_audit` ADD CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `flashcard_sessions` ADD CONSTRAINT `fk_flashcard_sessions_set` FOREIGN KEY (`set_id`) REFERENCES `fcsets`(`set_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `flashcard_sessions` ADD CONSTRAINT `fk_flashcard_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `study_plan_items` ADD CONSTRAINT `fk_plan_items_plan` FOREIGN KEY (`plan_id`) REFERENCES `study_plans`(`plan_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `study_plans` ADD CONSTRAINT `fk_study_plans_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `study_sessions` ADD CONSTRAINT `fk_study_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `todos` ADD CONSTRAINT `fk_todos_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `fk_user_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `usergrammarstatus` ADD CONSTRAINT `fk_ugs_grammar` FOREIGN KEY (`grammar_id`) REFERENCES `grammar`(`grammar_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usergrammarstatus` ADD CONSTRAINT `fk_ugs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uservocabstatus` ADD CONSTRAINT `fk_uvs_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `uservocabstatus` ADD CONSTRAINT `fk_uvs_vocab` FOREIGN KEY (`vocab_id`) REFERENCES `vocabitems`(`vocab_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vocabitems` ADD CONSTRAINT `vocabitems_topic_id_fkey` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`topic_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listening_attempts` ADD CONSTRAINT `listening_attempts_set_id_fkey` FOREIGN KEY (`set_id`) REFERENCES `listening_sets`(`set_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listening_attempts` ADD CONSTRAINT `listening_attempts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `listening_items` ADD CONSTRAINT `listening_items_set_id_fkey` FOREIGN KEY (`set_id`) REFERENCES `listening_sets`(`set_id`) ON DELETE CASCADE ON UPDATE CASCADE;
