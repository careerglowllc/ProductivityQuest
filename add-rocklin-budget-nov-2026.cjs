// Rocklin rental budget, live now and labelled "Effective Nov 1, 2026": tenant-paid bills drop to $0 (kept as lines, with a note on
// why), owner-paid lines are added, and the tenant's rent is tracked as income. The old rows are ended rather than changed or
// removed, so what they cost before today is still on record. Safe to run again.
// Usage: node -r dotenv/config add-rocklin-budget-nov-2026.cjs

const { neon } = require('@neondatabase/serverless');

const EFFECTIVE_LABEL = 'Effective Nov 1, 2026';
const LIVE_FROM = '2026-10-20'; // the new lines count from this day, so every earlier day keeps the old numbers
const LAST_OLD_DAY = '2026-10-19'; // the old lines count up to this day
const PROPERTY = 'Investment Property Housing';

// An earlier run scheduled these for Nov 1; they are brought forward instead.
const SCHEDULED_START = '2026-11-01';
const SCHEDULED_END = '2026-10-31';

// Existing rows that end, by their current names.
const ENDING = [
  'Rocklin PG&E Electric (Amortized NEM Rollup plus monthly separate cost)',
  'Rocklin PG&E Gas Monthly',
  'Rocklin Water Utility Bill (PCWA)',
  'Rocklin House Garbage Bin Rentals/Pickup',
  'Rocklin House Sewer Utility Bill',
];

// New rows, in cents. `notes` is the small grey line shown under the name.
const ROWS = [
  { item: 'PG&E Electricity', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Previously $180/mo; now tenant-paid.' },
  { item: 'PG&E Gas', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Previously $115/mo; now tenant-paid.' },
  { item: 'PCWA Water', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Previously $115.26/mo; now tenant-paid.' },
  { item: 'Recology Garbage', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Previously $34/mo; now tenant-paid.' },
  { item: 'Sewer', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Previously $40/mo; tenant now reimburses $43/mo.' },
  { item: 'Landscaping', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 0, notes: 'Normally $100/mo; now fully covered by tenant.' },
  { item: 'RNB Property Management', category: PROPERTY, tags: [EFFECTIVE_LABEL], monthlyCost: 16500, notes: null },
  // Rental income, kept apart from the property's expenses. The $100 landscaping reimbursement, the $50 resident benefits
  // package, the refundable security deposit and the $43 sewer reimbursement are not income and are left out: the sewer
  // bill and its reimbursement are treated as the same $43, a wash, so the Sewer line above nets to $0.
  { item: 'Rocklin Base Rent', category: 'Income', tags: ['Rental Income', EFFECTIVE_LABEL], monthlyCost: 244900, notes: null },
];

// Lines an earlier run added that are no longer wanted: the sewer reimbursement as income, and the real $40 sewer bill kept for
// reporting. They are ended (not deleted), so they stop counting from the day after RETIRED_LAST_DAY.
const RETIRED_LAST_DAY = '2026-10-20';
const RETIRED = ['Rocklin Sewer Reimbursement', 'Sewer (actual bill, paid by owner)'];

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  for (const name of ENDING) {
    const done = await sql`
      UPDATE financial_items SET effective_until = ${LAST_OLD_DAY}
      WHERE user_id = ${userId} AND item = ${name} AND (effective_until IS NULL OR effective_until = ${SCHEDULED_END})
      RETURNING id
    `;
    console.log(done.length ? `Ended ${name} after ${LAST_OLD_DAY} (id ${done[0].id})` : `Already ended or not found: ${name}`);
  }

  for (const row of ROWS) {
    const moved = await sql`
      UPDATE financial_items SET effective_from = ${LIVE_FROM}, tags = ${JSON.stringify(row.tags)}
      WHERE user_id = ${userId} AND item = ${row.item} AND effective_from = ${SCHEDULED_START}
      RETURNING id
    `;
    if (moved.length) { console.log('Brought forward:', row.item, 'id', moved[0].id); continue; }
    const exists = await sql`
      SELECT id FROM financial_items
      WHERE user_id = ${userId} AND item = ${row.item} AND tags @> ${JSON.stringify([EFFECTIVE_LABEL])}::jsonb LIMIT 1
    `;
    if (exists.length) { console.log('Already exists:', row.item, 'id', exists[0].id); continue; }
    const r = await sql`
      INSERT INTO financial_items (user_id, item, category, tags, monthly_cost, recur_type, notes, effective_from)
      VALUES (${userId}, ${row.item}, ${row.category}, ${JSON.stringify(row.tags)}, ${row.monthlyCost}, 'Monthly', ${row.notes}, ${LIVE_FROM})
      RETURNING id
    `;
    console.log('Inserted', row.item, '$' + (row.monthlyCost / 100).toFixed(2) + '/mo, id', r[0].id);
  }

  for (const name of RETIRED) {
    const done = await sql`
      UPDATE financial_items SET effective_until = ${RETIRED_LAST_DAY}
      WHERE user_id = ${userId} AND item = ${name} AND effective_until IS NULL
      RETURNING id
    `;
    console.log(done.length ? `Ended ${name} after ${RETIRED_LAST_DAY} (id ${done[0].id})` : `Already ended or not found: ${name}`);
  }
}

if (require.main === module) run().catch(console.error);

module.exports = { EFFECTIVE_LABEL, LIVE_FROM, LAST_OLD_DAY, RETIRED_LAST_DAY, ENDING, ROWS, RETIRED };
