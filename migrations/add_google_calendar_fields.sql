-- Migration: Add Google Calendar Integration Fields
-- Date: 2024
-- Description: Adds fields to support Google Calendar OAuth and sync functionality

ALTER TABLE users
ADD COLUMN google_calendar_client_id TEXT,
ADD COLUMN google_calendar_client_secret TEXT,
ADD COLUMN google_calendar_refresh_token TEXT,
ADD COLUMN google_calendar_access_token TEXT,
ADD COLUMN google_calendar_token_expiry TIMESTAMP,
ADD COLUMN google_calendar_sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN google_calendar_sync_direction TEXT DEFAULT 'both',
ADD COLUMN google_calendar_last_sync TIMESTAMP;

-- Add index on sync enabled for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_google_calendar_sync_enabled 
ON users(google_calendar_sync_enabled) 
WHERE google_calendar_sync_enabled = true;

-- Add google_event_id to tasks table for tracking synced events
ALTER TABLE tasks
ADD COLUMN google_event_id TEXT;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tasks_google_event_id ON tasks(google_event_id);
