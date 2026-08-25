// Adds a $2230 family contribution (Dr. Miller crown/bleach tray) for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-dr-miller-contribution.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const exists = await sql`
    SELECT id FROM family_contributions
    WHERE user_id = ${userId} AND amount = 223000 AND date_given::date = '2026-08-24'
    LIMIT 1
  `;
  if (exists.length) {
    console.log('Family contribution already exists, id:', exists[0].id);
    return;
  }

  const c = await sql`
    INSERT INTO family_contributions (user_id, amount, description, date_given)
    VALUES (${userId}, 223000, 'Dr. Miller — half of crown replacement and bleach tray cost', '2026-08-24')
    RETURNING id
  `;
  console.log('✅ Inserted $2230 Dr. Miller contribution, id:', c[0].id);
}

run().catch(console.error);
