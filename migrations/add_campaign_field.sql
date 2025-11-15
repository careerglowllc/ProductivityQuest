-- Add campaign field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS campaign TEXT DEFAULT 'unassigned';

-- Update any NULL values to 'unassigned'
UPDATE tasks SET campaign = 'unassigned' WHERE campaign IS NULL;
