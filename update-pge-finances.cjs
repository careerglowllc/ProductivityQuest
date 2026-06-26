/**
 * Update PG&E utility line items for alexbaer321@gmail.com
 *
 * - Removes the old "Rough Electricity and Gas bill monthly (...)" expense
 * - Adds:
 *     Rocklin PG&E Electric (Amortized NEM Rollup plus monthly separate cost) — $180/mo
 *     Rocklin PG&E Gas Monthly — $115/mo
 *
 * monthly_cost is stored in CENTS.
 *
 * Run:  node update-pge-finances.cjs
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

// --- Load DATABASE_URL from .env (simple parser, no dependency needed) ---
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  let val = line.slice('DATABASE_URL='.length).trim();
  // strip optional surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

const TARGET_EMAIL = 'alexbaer321@gmail.com';

// New items to ensure exist (monthly_cost in cents)
const NEW_ITEMS = [
  {
    item: 'Rocklin PG&E Electric (Amortized NEM Rollup plus monthly separate cost)',
    category: 'Housing',
    monthlyCost: 18000, // $180.00
    recurType: 'Monthly',
  },
  {
    item: 'Rocklin PG&E Gas Monthly',
    category: 'Housing',
    monthlyCost: 11500, // $115.00
    recurType: 'Monthly',
  },
];

async function main() {
  const connectionString = loadDatabaseUrl();
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found (env or .env file).');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    // 1. Find the user
    const userResult = await pool.query(
      `SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [TARGET_EMAIL]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User with email "${TARGET_EMAIL}" not found. Existing users:`);
      const allUsers = await pool.query(`SELECT id, username, email FROM users ORDER BY email`);
      allUsers.rows.forEach((u) => console.log(`   - ${u.email || 'N/A'} (${u.username || 'N/A'}) — ${u.id}`));
      return;
    }

    const user = userResult.rows[0];
    const userId = user.id;
    console.log(`✅ Found user: ${user.email} (${user.username || 'no-username'}) — ID: ${userId}\n`);

    // 2. Show + delete the old electricity/gas item(s)
    const oldMatch = await pool.query(
      `SELECT id, item, monthly_cost FROM financial_items
       WHERE user_id = $1 AND item ILIKE '%Rough Electricity and Gas bill%'`,
      [userId]
    );

    if (oldMatch.rows.length === 0) {
      console.log('ℹ️  No "Rough Electricity and Gas bill..." item found (already removed?).');
    } else {
      oldMatch.rows.forEach((r) =>
        console.log(`🗑️  Deleting: "${r.item}" ($${(r.monthly_cost / 100).toFixed(2)}/mo)`)
      );
      const del = await pool.query(
        `DELETE FROM financial_items
         WHERE user_id = $1 AND item ILIKE '%Rough Electricity and Gas bill%'`,
        [userId]
      );
      console.log(`   → Deleted ${del.rowCount} row(s).`);
    }
    console.log('');

    // 3. Insert the two new items (idempotent — skip if exact item name already exists)
    for (const ni of NEW_ITEMS) {
      const exists = await pool.query(
        `SELECT id FROM financial_items WHERE user_id = $1 AND item = $2`,
        [userId, ni.item]
      );
      if (exists.rows.length > 0) {
        // Update cost/category to be safe
        await pool.query(
          `UPDATE financial_items
           SET monthly_cost = $3, category = $4, recur_type = $5, updated_at = NOW()
           WHERE user_id = $1 AND item = $2`,
          [userId, ni.item, ni.monthlyCost, ni.category, ni.recurType]
        );
        console.log(`♻️  Updated existing: "${ni.item}" → $${(ni.monthlyCost / 100).toFixed(2)}/mo`);
      } else {
        await pool.query(
          `INSERT INTO financial_items (user_id, item, category, monthly_cost, recur_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, ni.item, ni.category, ni.monthlyCost, ni.recurType]
        );
        console.log(`➕ Added: "${ni.item}" — $${(ni.monthlyCost / 100).toFixed(2)}/mo (${ni.category}, ${ni.recurType})`);
      }
    }

    // 4. Verify final state of these items
    console.log('\n── Verification (current PG&E/utility items) ──');
    const verify = await pool.query(
      `SELECT item, category, monthly_cost, recur_type FROM financial_items
       WHERE user_id = $1 AND (item ILIKE '%PG&E%' OR item ILIKE '%Rough Electricity%')
       ORDER BY item`,
      [userId]
    );
    verify.rows.forEach((r) =>
      console.log(`   • ${r.item} — $${(r.monthly_cost / 100).toFixed(2)}/mo [${r.category}, ${r.recur_type}]`)
    );
    console.log('\n✅ Done.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
