const { Pool } = require('@neondatabase/serverless');
const { Client } = require('@notionhq/client');

async function fix() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Get user's Notion credentials
  const userResult = await pool.query(`
    SELECT notion_api_key, notion_database_id 
    FROM users 
    WHERE id = 'user_1763065240852_awwohbs0a'
  `);
  
  const { notion_api_key, notion_database_id } = userResult.rows[0];
  const notion = new Client({ auth: notion_api_key });
  
  // Get all tasks from Notion with due dates
  const response = await notion.databases.query({
    database_id: notion_database_id,
    page_size: 100,
  });
  
  console.log('Fetched', response.results.length, 'tasks from Notion');
  
  let updated = 0;
  for (const page of response.results) {
    const props = page.properties;
    const notionId = page.id;
    const dueRaw = props.Due?.date?.start;
    
    if (!dueRaw) continue;
    
    // Parse the date correctly
    const correctDueDate = new Date(dueRaw);
    
    // Update all tasks in the database with this notion_id
    const result = await pool.query(`
      UPDATE tasks 
      SET due_date = $1, "scheduledTime" = $1
      WHERE notion_id = $2
      AND user_id = 'user_1763065240852_awwohbs0a'
      RETURNING title
    `, [correctDueDate.toISOString(), notionId]);
    
    if (result.rowCount > 0) {
      console.log('Updated:', result.rows[0].title, '->', correctDueDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      updated++;
    }
  }
  
  console.log('\nTotal updated:', updated);
  await pool.end();
}

fix().catch(console.error);
