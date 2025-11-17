-- Add completed_milestones column to user_skills table
-- This stores the IDs of milestones that users have manually marked as complete

ALTER TABLE user_skills 
ADD COLUMN IF NOT EXISTS completed_milestones JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_skills.completed_milestones IS 'Array of milestone IDs that user has manually completed';
