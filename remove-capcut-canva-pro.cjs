// Removes the "CapCut Pro" ($20/mo) and "Canva Pro (admin@mycareerglow)" ($15/mo) expenses for alexbaer321@gmail.com.
// The rows are saved to backups/ first, so they can be put back with --undo <file>. Safe to re-run.
// Usage: node -r dotenv/config remove-capcut-canva-pro.cjs
//        node -r dotenv/config remove-capcut-canva-pro.cjs --undo backups/capcut-canva-pro-<time>.json
const fs = require('fs');
const { neon } = require('@neondatabase/serverless');

const ITEMS = ['CapCut Pro', 'Canva Pro (admin@mycareerglow)'];

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const undoIndex = process.argv.indexOf('--undo');
  if (undoIndex !== -1) {
    const rows = JSON.parse(fs.readFileSync(process.argv[undoIndex + 1], 'utf8'));
    for (const r of rows) {
      await sql`INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes, effective_from, effective_until)
        VALUES (${userId}, ${r.item}, ${r.category}, ${JSON.stringify(r.tags ?? [])}, ${r.monthly_cost}, ${r.recur_type}, ${r.notes}, ${r.effective_from}, ${r.effective_until})`;
    }
    console.log(`↩️ Put back ${rows.length} row(s).`);
    return;
  }

  const rows = await sql`SELECT * FROM financial_items WHERE user_id = ${userId} AND item = ANY(${ITEMS})`;
  if (!rows.length) { console.log('Not in the expenses; nothing to remove.'); return; }
  fs.mkdirSync('backups', { recursive: true });
  const file = `backups/capcut-canva-pro-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  const removed = await sql`DELETE FROM financial_items WHERE user_id = ${userId} AND item = ANY(${ITEMS}) RETURNING id, item`;
  console.log(`✅ Removed ${removed.map((r) => `${r.item} (id ${r.id})`).join(', ')}. Backup: ${file}`);
}

run().catch(console.error);
