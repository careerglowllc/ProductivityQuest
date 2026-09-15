/**
 * Update "Neon Database for MailWisp Free Plan for now" financial item to
 * $12/mo, with a note that it's usage-based and the actual average monthly
 * cost still needs to be checked.
 *
 * Run:  node update-neon-expense.cjs
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

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
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
}

const TARGET_EMAIL = 'alexbaer321@gmail.com';
const NEW_MONTHLY_COST_CENTS = 1200; // $12/mo
const NEW_NOTE = "Usage-based (Neon compute/storage) — need to check actual average monthly cost.";

async function main() {
  const connectionString = loadDatabaseUrl();
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in env or .env file.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const userResult = await pool.query(
      `SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [TARGET_EMAIL]
    );
    if (userResult.rows.length === 0) {
      console.error(`❌ User with email "${TARGET_EMAIL}" not found.`);
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user: ${userResult.rows[0].email} — ID: ${userId}\n`);

    const match = await pool.query(
      `SELECT id, item, monthly_cost, notes FROM financial_items
       WHERE user_id = $1 AND item ILIKE '%Neon%'`,
      [userId]
    );

    if (match.rows.length === 0) {
      console.log('ℹ️  No matching "Neon" item found.');
      return;
    }

    for (const row of match.rows) {
      console.log(`Found: "${row.item}" — currently $${(row.monthly_cost / 100).toFixed(2)}/mo, notes: ${row.notes || '(none)'}`);
      await pool.query(
        `UPDATE financial_items SET monthly_cost = $1, notes = $2, updated_at = NOW() WHERE id = $3`,
        [NEW_MONTHLY_COST_CENTS, NEW_NOTE, row.id]
      );
      console.log(`✅ Updated to $${(NEW_MONTHLY_COST_CENTS / 100).toFixed(2)}/mo with note: "${NEW_NOTE}"\n`);
    }
  } finally {
    await pool.end();
  }
}

main();
