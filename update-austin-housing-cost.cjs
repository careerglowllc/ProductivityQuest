// Sets the Tentative Austin Housing Cost placeholder to $2,100/mo for alexbaer321@gmail.com
// Usage: node -r dotenv/config update-austin-housing-cost.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = 'Tentative Austin Housing Cost';
const MONTHLY_CENTS = 210000;

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const r = await sql`
    UPDATE financial_items SET monthly_cost = ${MONTHLY_CENTS}, updated_at = NOW()
    WHERE user_id = ${userId} AND item = ${ITEM} AND monthly_cost <> ${MONTHLY_CENTS}
    RETURNING id, monthly_cost
  `;
  console.log(r.length ? `Updated ${ITEM} to $${(r[0].monthly_cost / 100).toFixed(2)}/mo, id ${r[0].id}` : `Already $${(MONTHLY_CENTS / 100).toFixed(2)}/mo or not found`);
}

if (require.main === module) run().catch(console.error);

module.exports = { ITEM, MONTHLY_CENTS };
