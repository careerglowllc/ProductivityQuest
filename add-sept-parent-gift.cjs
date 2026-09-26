// Adds a $10,000 family contribution given around 9/22/2026 for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-sept-parent-gift.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const contribExists = await sql`
    SELECT id FROM family_contributions
    WHERE user_id = ${userId} AND amount = 1000000 AND date_given::date = '2026-09-22'
    LIMIT 1
  `;
  if (contribExists.length) {
    console.log('Family contribution already exists, id:', contribExists[0].id);
  } else {
    const c = await sql`
      INSERT INTO family_contributions (user_id, amount, description, date_given)
      VALUES (${userId}, 1000000, 'Parent contribution', '2026-09-22')
      RETURNING id
    `;
    console.log('✅ Inserted $10,000 parent contribution, id:', c[0].id);
  }
}

run().catch(console.error);
