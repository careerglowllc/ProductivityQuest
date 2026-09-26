// Fixes a typo: the "PRQ" quest in the Looks Maximization questline should be "PRK".
// Usage: node -r dotenv/config fix-prq-to-prk.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const rows = await sql`SELECT id, title FROM tasks WHERE user_id = ${userId} AND title = 'PRQ'`;
  if (!rows.length) { console.log('No task titled "PRQ" found'); return; }

  for (const row of rows) {
    await sql`UPDATE tasks SET title = 'PRK' WHERE id = ${row.id}`;
    console.log(`✅ Renamed task id ${row.id}: "PRQ" -> "PRK"`);
  }
}

run().catch(console.error);
