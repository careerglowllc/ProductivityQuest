// Run the completed milestones migration
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Running completed milestones migration...');
  
  const sql = neon(connectionString);
  
  try {
    // Execute the ALTER TABLE statement
    console.log('📄 Adding completed_milestones column...');
    await sql`
      ALTER TABLE user_skills 
      ADD COLUMN IF NOT EXISTS completed_milestones JSONB DEFAULT '[]'::jsonb
    `;
    
    // Execute the COMMENT statement separately
    console.log('📄 Adding column comment...');
    await sql`
      COMMENT ON COLUMN user_skills.completed_milestones IS 'Array of milestone IDs that user has manually completed'
    `;
    
    console.log('✅ Completed milestones migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
