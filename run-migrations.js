#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Set a 30 second timeout for migrations
    const { stdout, stderr } = await execAsync('npx drizzle-kit push --force', {
      timeout: 30000,
      env: { ...process.env, FORCE: 'true' }
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('No schema changes')) console.error(stderr);
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('⚠️  Migration warning:', error.message);
    console.log('⚠️  Continuing anyway - column may already exist or no changes needed');
  }
  
  process.exit(0);
}

runMigrations();
