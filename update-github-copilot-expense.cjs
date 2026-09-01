/**
 * Rename "GitHub Copilot Max" business expense to "GitHub Copilot Pro" and
 * reduce its cost to $10/mo for alexbaer321@gmail.com.
 *
 * Run:  node update-github-copilot-expense.cjs
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
const NEW_ITEM_NAME = 'GitHub Copilot Pro';
const NEW_MONTHLY_COST_CENTS = 1000; // $10.00/mo

async function main() {
  const connectionString = loadDatabaseUrl();
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in env or .env file.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const userResult = await pool.query(
      `SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)`,
      [TARGET_EMAIL]
    );
    if (userResult.rows.length === 0) {
      console.error(`❌ User with email "${TARGET_EMAIL}" not found.`);
      return;
    }
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user: ${userResult.rows[0].email} — ID: ${userId}\n`);

    const match = await pool.query(
      `SELECT id, item, monthly_cost FROM financial_items
       WHERE user_id = $1 AND item ILIKE '%GitHub Copilot Max%'`,
      [userId]
    );

    if (match.rows.length === 0) {
      console.log('ℹ️  No matching "GitHub Copilot Max" item found (already updated?).');
      return;
    }

    for (const row of match.rows) {
      console.log(`✏️  Updating: "${row.item}" ($${(row.monthly_cost / 100).toFixed(2)}/mo) → "${NEW_ITEM_NAME}" ($${(NEW_MONTHLY_COST_CENTS / 100).toFixed(2)}/mo)`);
    }
    const upd = await pool.query(
      `UPDATE financial_items
       SET item = $2, monthly_cost = $3, updated_at = NOW()
       WHERE user_id = $1 AND item ILIKE '%GitHub Copilot Max%'`,
      [userId, NEW_ITEM_NAME, NEW_MONTHLY_COST_CENTS]
    );
    console.log(`   → Updated ${upd.rowCount} row(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
