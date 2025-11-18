// Cleanup script to remove Google Calendar events that were incorrectly imported as tasks
// Run with: node -r dotenv/config cleanup-google-calendar-tasks.js

const { neon } = require('@neondatabase/serverless');

async function cleanup() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🧹 Starting cleanup of Google Calendar imported tasks...');
    
    // Delete tasks that have a googleEventId (these were imported from Google Calendar)
    const result = await sql`
      DELETE FROM tasks 
      WHERE google_event_id IS NOT NULL
      RETURNING id, title
    `;
    
    console.log(`✅ Deleted ${result.length} Google Calendar imported tasks:`);
    result.forEach(task => {
      console.log(`   - ${task.title} (ID: ${task.id})`);
    });
    
    console.log('\n✨ Cleanup complete!');
    console.log('📝 Your tasks list now only contains ProductivityQuest tasks');
    console.log('📅 Google Calendar events will still appear in the calendar view');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

cleanup();
