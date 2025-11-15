-- Add recycling bin fields to tasks table
-- This migration ensures existing tasks have proper default values

-- Update existing tasks to have recycling defaults if not already set
UPDATE tasks 
SET 
  recycled = COALESCE(recycled, false),
  recycled_at = NULL,
  recycled_reason = NULL
WHERE recycled IS NULL OR recycled_at IS NOT NULL AND recycled = false;

-- Ensure all tasks marked as completed before recycling feature are moved to recycling
-- This is optional - uncomment if you want to move all previously completed tasks to recycling
-- UPDATE tasks 
-- SET 
--   recycled = true,
--   recycled_at = COALESCE(completed_at, NOW()),
--   recycled_reason = 'completed'
-- WHERE completed = true AND recycled = false;
