-- Migration: add_user_role_and_admin_audit
-- Created by assistant (create-only migration for review)

-- Add 'role' column to users table (enum: 'user','admin')
ALTER TABLE `users`
  ADD COLUMN `role` ENUM('user','admin') NOT NULL DEFAULT 'user';

-- Create admin_audit table
CREATE TABLE `admin_audit` (
  `audit_id` INT NOT NULL AUTO_INCREMENT,
  `admin_user_id` INT NOT NULL,
  `target_user_id` INT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`audit_id`),
  INDEX `idx_audit_admin` (`admin_user_id`),
  INDEX `idx_audit_target` (`target_user_id`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;


