// Sets "Render Web Service (Tome & Taper Website)" to $0/mo with a note that the service is suspended, for alexbaer321@gmail.com.
// Safe to re-run. Put it back ($7/mo, no note) with --undo.
// Usage: node -r dotenv/config suspend-tomeandtaper-render.cjs
//        node -r dotenv/config suspend-tomeandtaper-render.cjs --undo
const { neon } = require('@neondatabase/serverless');

const ITEM = 'Render Web Service (Tome & Taper Website)';
const NOTE = 'Suspended/paused on Render, so no charge ($7/mo when running)';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const undo = process.argv.includes('--undo');
  const cents = undo ? 700 : 0;
  const note = undo ? null : NOTE;
  const r = await sql`
    UPDATE financial_items SET monthly_cost = ${cents}, notes = ${note}, updated_at = NOW()
    WHERE user_id = ${userId} AND item = ${ITEM}
    RETURNING id, monthly_cost, notes`;
  if (!r.length) { console.log('Not in the expenses; nothing to update.'); return; }
  console.log(`✅ ${ITEM} is $${(r[0].monthly_cost / 100).toFixed(2)}/mo, note: ${r[0].notes ?? '(none)'}, id:`, r[0].id);
}

run().catch(console.error);
