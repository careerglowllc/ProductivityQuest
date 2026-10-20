// Adds DoorDash DashPass Premium at $0/mo (included with Chase Sapphire Preferred) to financial_items for alexbaer321@gmail.com
// Usage: node -r dotenv/config add-dashpass-premium.cjs

const { neon } = require('@neondatabase/serverless');

const ITEM = {
  item: 'DoorDash DashPass Premium',
  category: 'Entertainment',
  tags: ['Entertainment', 'Subscription', 'AB'],
  monthlyCost: 0, // cents
  recurType: 'Monthly',
  notes: '$0/mo — included free with the Chase Sapphire Preferred card',
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
  console.log('Inserted', ITEM.item, '$0/mo, id:', r[0].id);
}

if (require.main === module) run().catch(console.error);

module.exports = { ITEM };
