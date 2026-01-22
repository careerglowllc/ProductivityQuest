-- Add constellation_milestones column to user_skills table
-- This stores the custom milestone constellation nodes that users can edit

ALTER TABLE user_skills 
ADD COLUMN IF NOT EXISTS constellation_milestones JSONB DEFAULT '[]'::jsonb;

-- The constellation_milestones field will store an array of objects like:
-- [
--   { "id": "start", "title": "Begin Your Journey", "level": 1, "x": 50, "y": 85 },
--   { "id": "milestone-1", "title": "Visit 10 Countries", "level": 10, "x": 35, "y": 65 },
--   ...
-- ]

COMMENT ON COLUMN user_skills.constellation_milestones IS 'Custom milestone constellation nodes with positions and titles';
