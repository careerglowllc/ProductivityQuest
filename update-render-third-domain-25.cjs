// Changes "Render Third Custom Domain Add-on" from $0.25/mo to $25/mo (billed monthly) for alexbaer321@gmail.com.
// Safe to re-run. Put it back with: node -r dotenv/config update-render-third-domain-25.cjs --undo
// Usage: node -r dotenv/config update-render-third-domain-25.cjs
const { neon } = require('@neondatabase/serverless');

const ITEM = 'Render Third Custom Domain Add-on';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const cents = process.argv.includes('--undo') ? 25 : 2500;
  const r = await sql`
    UPDATE financial_items SET monthly_cost = ${cents}, recur_type = 'Monthly'
    WHERE user_id = ${userId} AND item = ${ITEM}
    RETURNING id, monthly_cost, recur_type`;
  if (!r.length) { console.log('Not in the expenses; nothing to update.'); return; }
  console.log(`✅ ${ITEM} is now $${(r[0].monthly_cost / 100).toFixed(2)}/mo (${r[0].recur_type}), id:`, r[0].id);
}

run().catch(console.error);
