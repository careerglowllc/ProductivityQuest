// Adds Meta Verified (Tome & Taper) $14.99/mo to financial_items for alexbaer321@gmail.com.
// Unclear whether it is actually being charged, so that is recorded in the notes.
// Usage: node -r dotenv/config add-meta-verified-tomeandtaper.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = 'Meta Verified (Tome & Taper)';

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
    VALUES (${userId}, ${ITEM}, 'Business', ${JSON.stringify(['Business'])}, 1499, 'Monthly',
            'Not clear whether this is actually being charged — verify against card/Meta billing.')
    RETURNING id
  `;
  console.log('✅ Inserted', ITEM, '$14.99/mo, id:', r[0].id);
}

run().catch(console.error);
