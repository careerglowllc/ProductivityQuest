// Adds "Google Fiber 500 Mbps Internet (Austin Apartment)" ($55/mo, billed monthly) to financial_items for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-google-fiber-austin.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = 'Google Fiber 500 Mbps Internet (Austin Apartment)';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const exists = await sql`SELECT id FROM financial_items WHERE user_id = ${userId} AND item = ${ITEM} LIMIT 1`;
  if (exists.length) {
    console.log('Already exists, id:', exists[0].id);
    return;
  }

  const r = await sql`
    INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes)
    VALUES (${userId}, ${ITEM}, 'Personal Housing', ${JSON.stringify(['Personal Housing'])}, 5500, 'Monthly', 'Google Fiber 500 Mbps, billed monthly')
    RETURNING id, monthly_cost
  `;
  console.log(`✅ Inserted ${ITEM} $${(r[0].monthly_cost / 100).toFixed(2)}/mo, id:`, r[0].id);
}

run().catch(console.error);
