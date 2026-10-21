// Rocklin rental budget from Nov 1, 2026: tenant-paid bills drop to $0 (kept as lines, with a note on why), owner-paid lines
// are added, and the tenant's rent is tracked as income. The old rows are ended Oct 31 rather than changed, so every earlier
// month keeps its numbers. Safe to run again.
// Usage: node -r dotenv/config add-rocklin-budget-nov-2026.cjs

const { neon } = require('@neondatabase/serverless');

const EFFECTIVE = '2026-11-01';
const LAST_OLD_DAY = '2026-10-31';
const PROPERTY = 'Investment Property Housing';

// Existing rows that end Oct 31, by their current names.
const ENDING = [
  'Rocklin PG&E Electric (Amortized NEM Rollup plus monthly separate cost)',
  'Rocklin PG&E Gas Monthly',
  'Rocklin Water Utility Bill (PCWA)',
  'Rocklin House Garbage Bin Rentals/Pickup',
  'Rocklin House Sewer Utility Bill',
];

// New rows from Nov 1, in cents. `notes` is the small grey line shown under the name.
const ROWS = [
  { item: 'PG&E Electricity', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Previously $180/mo; now tenant-paid.' },
  { item: 'PG&E Gas', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Previously $115/mo; now tenant-paid.' },
  { item: 'PCWA Water', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Previously $115.26/mo; now tenant-paid.' },
  { item: 'Recology Garbage', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Previously $34/mo; now tenant-paid.' },
  { item: 'Sewer', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Previously $40/mo; tenant now reimburses $43/mo.' },
  { item: 'Landscaping', category: PROPERTY, tags: [], monthlyCost: 0, notes: 'Normally $100/mo; now fully covered by tenant.' },
  { item: 'RNB Property Management', category: PROPERTY, tags: [], monthlyCost: 16500, notes: null },
  // Rental income, kept apart from the property's expenses. The $100 landscaping reimbursement, the $50 resident benefits
  // package and the refundable security deposit are not income and are left out.
  { item: 'Rocklin Base Rent', category: 'Income', tags: ['Rental Income'], monthlyCost: 244900, notes: null },
  { item: 'Rocklin Sewer Reimbursement', category: 'Income', tags: ['Rental Income'], monthlyCost: 4300, notes: null },
  // The $40 sewer bill is still paid by the owner. It is shown as $0 above to match the budget as presented, so the real
  // bill is kept here for accurate reporting; a Memo row is never added into any total.
  {
    item: 'Sewer (actual bill, paid by owner)', category: PROPERTY, tags: ['Memo'], monthlyCost: 4000,
    notes: 'Reporting only, not in the totals. The $43/mo tenant reimbursement is counted as rental income.',
  },
];

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  for (const name of ENDING) {
    const done = await sql`
      UPDATE financial_items SET effective_until = ${LAST_OLD_DAY}
      WHERE user_id = ${userId} AND item = ${name} AND effective_until IS NULL
      RETURNING id
    `;
    console.log(done.length ? `Ended ${name} on ${LAST_OLD_DAY} (id ${done[0].id})` : `Already ended or not found: ${name}`);
  }

  for (const row of ROWS) {
    const exists = await sql`SELECT id FROM financial_items WHERE user_id = ${userId} AND item = ${row.item} AND effective_from = ${EFFECTIVE} LIMIT 1`;
    if (exists.length) { console.log('Already exists:', row.item, 'id', exists[0].id); continue; }
    const r = await sql`
      INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes, effective_from)
      VALUES (${userId}, ${row.item}, ${row.category}, ${JSON.stringify(row.tags)}, ${row.monthlyCost}, 'Monthly', ${row.notes}, ${EFFECTIVE})
      RETURNING id
    `;
    console.log('Inserted', row.item, '$' + (row.monthlyCost / 100).toFixed(2) + '/mo, id', r[0].id);
  }
}

if (require.main === module) run().catch(console.error);

module.exports = { EFFECTIVE, LAST_OLD_DAY, ENDING, ROWS };
