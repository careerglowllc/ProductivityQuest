-- Manual fix for scheduledTime column
-- Run this directly in your production database console if auto-migration fails

-- First, try to add the column (will fail silently if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'scheduledTime'
    ) THEN
        ALTER TABLE tasks ADD COLUMN "scheduledTime" TIMESTAMP;
        COMMENT ON COLUMN tasks."scheduledTime" IS 'Timestamp when the task is scheduled (specific date and time). If null, task appears at default time (9 AM) on due date in calendar.';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'scheduledTime';
