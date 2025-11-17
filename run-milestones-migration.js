// Run the constellation milestones migration on the production database
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  console.log('🔄 Running constellation milestones migration...');
  
  const sql = neon(connectionString);
  
  try {
    // Execute the ALTER TABLE statement
    console.log('📄 Adding constellation_milestones column...');
    await sql`
      ALTER TABLE user_skills 
      ADD COLUMN IF NOT EXISTS constellation_milestones JSONB DEFAULT '[]'::jsonb
    `;
    
    // Execute the COMMENT statement separately
    console.log('📄 Adding column comment...');
    await sql`
      COMMENT ON COLUMN user_skills.constellation_milestones IS 'Custom milestone constellation nodes with positions and titles'
    `;
    
    console.log('✅ Constellation milestones migration completed successfully!');
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
