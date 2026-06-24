import { neon } from '@neondatabase/serverless';

/**
 * Run essential migrations on server startup
 * This ensures critical columns exist even if migrations weren't run manually
 */
export async function runStartupMigrations() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not set, skipping startup migrations');
    return;
  }

  const sql = neon(connectionString);
  
  try {
    console.log('🔄 Running startup migrations...');
    
    // Migration: Add campaign field if it doesn't exist
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS campaign TEXT DEFAULT 'unassigned'
    `;
    
    // Update any NULL values to 'unassigned'
    await sql`
      UPDATE tasks 
      SET campaign = 'unassigned' 
      WHERE campaign IS NULL
    `;
    
    // Migration: Add timezone field to users table if it doesn't exist
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York'
    `;

    // Migration: Create questlines table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS questlines (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        icon TEXT DEFAULT '⚔️',
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMPTZ,
        bonus_awarded BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Migration: Add questline fields to tasks table
    await sql`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS questline_id INTEGER
    `;
    await sql`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS questline_order INTEGER
    `;

    // Migration: Add widget_preferences column to users table
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS widget_preferences JSONB DEFAULT '{}'
    `;

    // Migration: Add attachments column to tasks (inline base64 images/videos in the description)
    await sql`
      ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'
    `;

    // Migration: Create per-user key-value store. Backs the finance/net-worth inputs ("nw-*"),
    // CPAP log ("cpap-*"), and NPC rolodex ("npcs-*") that previously lived only in browser
    // localStorage — now persisted server-side, synced across devices, and scoped per user.
    await sql`
      CREATE TABLE IF NOT EXISTS user_kv (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id),
        key TEXT NOT NULL,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "IDX_user_kv_user" ON user_kv (user_id)
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_user_kv_user_key" ON user_kv (user_id, key)
    `;
    
    console.log('✅ Startup migrations completed successfully');
  } catch (error) {
    console.error('❌ Startup migrations failed:', error);
    // Don't throw - let the app start anyway
  }
}
