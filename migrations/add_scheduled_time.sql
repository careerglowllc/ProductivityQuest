-- Add scheduledTime field to tasks table to track when during the day a task is scheduled
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "scheduledTime" TIMESTAMP;

-- Add comment explaining the field
COMMENT ON COLUMN tasks."scheduledTime" IS 'Timestamp when the task is scheduled (specific date and time). If null, task appears at default time (9 AM) on due date in calendar.';
