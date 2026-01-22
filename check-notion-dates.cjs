const { Pool } = require('@neondatabase/serverless');

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Get user's Notion credentials
  const userResult = await pool.query(`
    SELECT notion_api_key, notion_database_id 
    FROM users 
    WHERE id = 'user_1763065240852_awwohbs0a'
  `);
  
  const { notion_api_key, notion_database_id } = userResult.rows[0];
  console.log('Has API key:', !!notion_api_key);
  console.log('Has database ID:', !!notion_database_id);
  
  // Now use the Notion client with these credentials
  const { Client } = require('@notionhq/client');
  const notion = new Client({ auth: notion_api_key });
  
  // Query the database for specific tasks
  const response = await notion.databases.query({
    database_id: notion_database_id,
    filter: {
      or: [
        { property: 'Task', title: { contains: 'Cardio' } },
        { property: 'Task', title: { contains: 'Facial Yoga' } },
        { property: 'Task', title: { contains: 'Evening Routine' } }
      ]
    },
    page_size: 10,
  });
  
  console.log('Found', response.results.length, 'tasks');
  
  for (const page of response.results) {
    const props = page.properties;
    const title = props.Task?.title?.[0]?.plain_text || 'Unknown';
    const dueRaw = props.Due?.date;
    
    console.log('\n=== Task:', title, '===');
    console.log('Raw Due property:', JSON.stringify(dueRaw, null, 2));
    
    if (dueRaw?.start) {
      console.log('Parsed as new Date():', new Date(dueRaw.start).toISOString());
      console.log('Displayed as PST:', new Date(dueRaw.start).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    }
  }
  
  await pool.end();
}

check().catch(console.error);
