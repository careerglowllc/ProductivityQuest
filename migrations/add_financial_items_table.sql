-- Create financial_items table for income and expense tracking
CREATE TABLE IF NOT EXISTS financial_items (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_cost INTEGER NOT NULL,
  recur_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_financial_items_user_id ON financial_items(user_id);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_financial_items_category ON financial_items(category);
