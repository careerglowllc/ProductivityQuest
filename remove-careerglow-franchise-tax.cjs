/**
 * Remove "CareerGlow LLC CA State Franchise Annual Tax" business expense item
 * for alexbaer321@gmail.com.
 *
 * Run:  node remove-careerglow-franchise-tax.cjs
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
      `SELECT id, item, monthly_cost FROM financial_items
       WHERE user_id = $1 AND item ILIKE '%CareerGlow%Franchise%Tax%'`,
      [userId]
    );

    if (match.rows.length === 0) {
      console.log('ℹ️  No matching "CareerGlow ... Franchise ... Tax" item found (already removed?).');
      return;
    }

    match.rows.forEach((r) =>
      console.log(`🗑️  Deleting: "${r.item}" ($${(r.monthly_cost / 100).toFixed(2)}/mo)`)
    );
    const del = await pool.query(
      `DELETE FROM financial_items WHERE user_id = $1 AND item ILIKE '%CareerGlow%Franchise%Tax%'`,
      [userId]
    );
    console.log(`   → Deleted ${del.rowCount} row(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
