// Adds Replit Core (CareerGlow) $20/mo to financial_items for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-replit-core.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const exists = await sql`SELECT id FROM financial_items WHERE user_id = ${userId} AND item = 'Replit Core (CareerGlow)' LIMIT 1`;
  if (exists.length) {
    console.log('Already exists, id:', exists[0].id);
    return;
  }

  const r = await sql`
    INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type)
    VALUES (${userId}, 'Replit Core (CareerGlow)', 'Business', ${JSON.stringify(['Business'])}, 2000, 'Monthly')
    RETURNING id
  `;
  console.log('✅ Inserted Replit Core (CareerGlow) $20/mo, id:', r[0].id);
}

run().catch(console.error);
