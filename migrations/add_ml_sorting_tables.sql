-- ML Sorting Feature: Database Migration
-- Run this SQL in your Neon database console

-- Table to store user feedback on ML sorting for training
CREATE TABLE IF NOT EXISTS ml_sorting_feedback (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date TIMESTAMP NOT NULL,
  original_schedule JSONB NOT NULL,
  ml_sorted_schedule JSONB NOT NULL,
  user_corrected_schedule JSONB,
  feedback_type TEXT NOT NULL,
  feedback_reason TEXT,
  task_metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to store learned user preferences for ML sorting
CREATE TABLE IF NOT EXISTS ml_sorting_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  preferred_start_hour INTEGER DEFAULT 9,
  preferred_end_hour INTEGER DEFAULT 18,
  priority_weights JSONB,
  break_duration INTEGER DEFAULT 15,
  high_priority_time_preference TEXT DEFAULT 'morning',
  total_approved INTEGER DEFAULT 0,
  total_corrected INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ml_sorting_feedback_user ON ml_sorting_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_sorting_feedback_date ON ml_sorting_feedback(date);
CREATE INDEX IF NOT EXISTS idx_ml_sorting_preferences_user ON ml_sorting_preferences(user_id);

-- Grant permissions if needed
-- GRANT ALL ON ml_sorting_feedback TO your_user;
-- GRANT ALL ON ml_sorting_preferences TO your_user;
