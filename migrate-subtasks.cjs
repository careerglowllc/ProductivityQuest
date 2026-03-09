// Quick migration to add parentTaskId and indentLevel columns to tasks table
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Add parentTaskId column (nullable integer)
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id INTEGER`;
    console.log('✅ Added parent_task_id column');
    
    // Add indentLevel column (default 0)
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS indent_level INTEGER DEFAULT 0`;
    console.log('✅ Added indent_level column');
    
    console.log('🎉 Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
