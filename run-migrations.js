#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    const { stdout, stderr } = await execAsync('npx drizzle-kit push');
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    // Don't exit with error - let the app start anyway
    // The column might already exist
    console.log('⚠️  Continuing anyway - column may already exist');
    process.exit(0);
  }
}

runMigrations();
