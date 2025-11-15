// Run the campaign field migration on the production database
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
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
  console.log('🔄 Running campaign field migration...');
  
  const client = postgres(connectionString);
  
  try {
    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, 'migrations', 'add_campaign_field.sql'),
      'utf-8'
    );
    
    console.log('📄 Migration SQL:', migrationSQL);
    
    // Execute the migration
    await client.unsafe(migrationSQL);
    
    console.log('✅ Campaign field migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
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
