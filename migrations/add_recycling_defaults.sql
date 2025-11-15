-- Migration: Set default values for recycling fields on existing tasks
-- This ensures that all existing tasks are marked as not recycled

UPDATE tasks
SET 
  recycled = false,
  recycled_at = NULL,
  recycled_reason = NULL
WHERE recycled IS NULL;
