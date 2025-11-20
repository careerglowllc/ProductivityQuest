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
    
    console.log('✅ Startup migrations completed successfully');
  } catch (error) {
    console.error('❌ Startup migrations failed:', error);
    // Don't throw - let the app start anyway
  }
}
