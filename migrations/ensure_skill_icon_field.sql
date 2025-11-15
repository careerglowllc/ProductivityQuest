-- Ensure skillIcon field exists in user_skills table
-- This migration is idempotent and can be run multiple times safely

DO $$ 
BEGIN
  -- Check if the column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_skills' 
    AND column_name = 'skill_icon'
  ) THEN
    ALTER TABLE user_skills ADD COLUMN skill_icon TEXT;
  END IF;
END $$;
