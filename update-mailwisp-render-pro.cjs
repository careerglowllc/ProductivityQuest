// Renames "MailWisp Render Web Service Standard" to "MailWisp Render Web Service Pro" ($25/mo, billed monthly)
// for alexbaer321@gmail.com, since the MailWisp main Render service is now on the Pro plan. Safe to re-run.
// Usage: node -r dotenv/config update-mailwisp-render-pro.cjs
//        node -r dotenv/config update-mailwisp-render-pro.cjs --undo
const { neon } = require('@neondatabase/serverless');

const STANDARD = 'MailWisp Render Web Service Standard';
const PRO = 'MailWisp Render Web Service Pro';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const [from, to] = process.argv.includes('--undo') ? [PRO, STANDARD] : [STANDARD, PRO];
  const r = await sql`
    UPDATE financial_items SET item = ${to}, monthly_cost = 2500, recur_type = 'Monthly'
    WHERE user_id = ${userId} AND item = ${from}
    RETURNING id, item, monthly_cost, recur_type`;
  if (!r.length) { console.log(`"${from}" not found; nothing to update.`); return; }
  console.log(`✅ ${r[0].item} is $${(r[0].monthly_cost / 100).toFixed(2)}/mo (${r[0].recur_type}), id:`, r[0].id);
}

run().catch(console.error);
