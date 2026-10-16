// Adds a $5.50/mo Giving What We Can donation (paid on the Barclays card) to financial_items for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-giving-what-we-can.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = {
  item: 'Charity (Giving What We Can — Barclays card)',
  category: 'Charity',
  tags: [],
  monthlyCost: 550, // cents
  recurType: 'Monthly',
  notes: 'Monthly donation to Giving What We Can, paid on the Barclays credit card',
};

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const exists = await sql`SELECT id FROM financial_items WHERE user_id = ${userId} AND item = ${ITEM.item} LIMIT 1`;
  if (exists.length) {
    console.log('Already exists, id:', exists[0].id);
    return;
  }

  const r = await sql`
    INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes)
    VALUES (${userId}, ${ITEM.item}, ${ITEM.category}, ${JSON.stringify(ITEM.tags)}, ${ITEM.monthlyCost}, ${ITEM.recurType}, ${ITEM.notes})
    RETURNING id
  `;
  console.log('✅ Inserted Giving What We Can $5.50/mo, id:', r[0].id);
}

if (require.main === module) run().catch(console.error);

module.exports = { ITEM };
