-- Add calendar color fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS calendar_color TEXT;
