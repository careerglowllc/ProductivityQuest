// Diagnostic script to check actual task counts in database
// Run with: node -r dotenv/config check-task-count.cjs YOUR_USER_ID

const { neon } = require('@neondatabase/serverless');

async function checkTaskCount() {
  const sql = neon(process.env.DATABASE_URL);
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Please provide userId as argument');
    console.log('Usage: node -r dotenv/config check-task-count.cjs YOUR_USER_ID');
    return;
  }
  
  try {
    console.log(`\n🔍 Checking tasks for user: ${userId}\n`);
    
    // Count active tasks (not recycled)
    const activeTasks = await sql`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ${userId} 
      AND recycled = false
    `;
    
    // Count recycled tasks
    const recycledTasks = await sql`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ${userId} 
      AND recycled = true
    `;
    
    // Count all tasks
    const allTasks = await sql`
      SELECT COUNT(*) as count 
      FROM tasks 
      WHERE user_id = ${userId}
    `;
    
    // Get sample of active tasks
    const sampleActive = await sql`
      SELECT id, title, created_at, recycled 
      FROM tasks 
      WHERE user_id = ${userId} 
      AND recycled = false
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    console.log('📊 Task Count Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Active tasks (recycled = false): ${activeTasks[0].count}`);
    console.log(`🗑️  Recycled tasks (recycled = true): ${recycledTasks[0].count}`);
    console.log(`📝 Total tasks: ${allTasks[0].count}`);
    console.log('');
    
    if (sampleActive.length > 0) {
      console.log('📋 Sample of active tasks:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      sampleActive.forEach(task => {
        console.log(`  ID: ${task.id} | ${task.title} | Recycled: ${task.recycled}`);
      });
    } else {
      console.log('✨ No active tasks found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTaskCount();
