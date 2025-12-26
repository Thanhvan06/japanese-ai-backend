-- Migration: drop_user_jlpt_level
-- Drops jlpt_level column from users table (remove user-level JLPT)

ALTER TABLE `users`
  DROP COLUMN `jlpt_level`;




