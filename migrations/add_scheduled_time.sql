-- Add scheduledTime field to tasks table to track when during the day a task is scheduled
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "scheduled_time" TIME;

-- Add comment explaining the field
COMMENT ON COLUMN tasks.scheduled_time IS 'Time of day when the task is scheduled (independent of due date). If null, task appears at default time in calendar.';
