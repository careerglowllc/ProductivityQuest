// Adds TSA PreCheck + CLEAR renewal ($219/yr amortized, net of the Chase Sapphire Preferred credit) to financial_items for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-tsa-clear.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = 'TSA PreCheck + CLEAR Renewal';
const YEARLY_CENTS = 21900;

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

  const notes = 'TSA PreCheck and CLEAR, renewed every few years — $219/yr amortized, after the Chase Sapphire Preferred credit';
  const r = await sql`
    INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes)
    VALUES (${userId}, ${ITEM}, 'General', ${JSON.stringify([])}, ${YEARLY_CENTS / 12}, 'Yearly (Amortized)', ${notes})
    RETURNING id, monthly_cost
  `;
  console.log('Inserted', ITEM, '$219/yr ($' + (r[0].monthly_cost / 100).toFixed(2) + '/mo), id:', r[0].id);
}

run().catch(console.error);
