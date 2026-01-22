import 'dotenv/config';
import { db } from './server/db';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running Google Calendar migration...');
    
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_google_calendar_fields.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and run each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await db.execute(statement);
          console.log('✓ Executed statement');
        } catch (err: any) {
          // Ignore "column already exists" errors
          if (err.message && err.message.includes('already exists')) {
            console.log('⚠️ Column already exists, skipping...');
          } else {
            throw err;
          }
        }
      }
    }
    
    console.log('✅ Google Calendar migration completed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
