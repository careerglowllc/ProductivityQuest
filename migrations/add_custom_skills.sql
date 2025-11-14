-- Migration: Add custom skills support to user_skills table
-- Date: 2025-01-15
-- Description: Adds fields for custom skill icons, descriptions, milestones, and isCustom flag

-- Add new columns
ALTER TABLE user_skills 
ADD COLUMN IF NOT EXISTS skill_icon TEXT,
ADD COLUMN IF NOT EXISTS skill_description TEXT,
ADD COLUMN IF NOT EXISTS skill_milestones JSONB,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false NOT NULL;

-- Set existing skills as non-custom (default skills)
UPDATE user_skills 
SET is_custom = false 
WHERE is_custom IS NULL OR is_custom = false;

-- Add index for faster custom skill queries
CREATE INDEX IF NOT EXISTS idx_user_skills_is_custom ON user_skills(user_id, is_custom);

-- Add index for skill name lookups
CREATE INDEX IF NOT EXISTS idx_user_skills_name ON user_skills(user_id, skill_name);

COMMENT ON COLUMN user_skills.skill_icon IS 'Icon name from Lucide React (e.g., "Star", "Heart", "Trophy")';
COMMENT ON COLUMN user_skills.skill_description IS 'Custom description used by AI for task categorization';
COMMENT ON COLUMN user_skills.skill_milestones IS 'Array of milestone strings (e.g., ["Level 10: Beginner", "Level 99: Master"])';
COMMENT ON COLUMN user_skills.is_custom IS 'true = user-created custom skill, false = default system skill';
