/**
 * Rename the $824 "Parent contribution" (8/24/2026) to "Dr Alfi Consult Fee"
 * for alexbaer321@gmail.com.
 *
 * Run:  node update-parent-contribution-dr-alfi.cjs
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
const NEW_DESCRIPTION = 'Dr Alfi Consult Fee';

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
      `SELECT id, description, amount, date_given FROM family_contributions
       WHERE user_id = $1 AND amount = 82400 AND date_given::date = '2026-08-24'`,
      [userId]
    );

    if (match.rows.length === 0) {
      console.log('ℹ️  No matching $824 contribution dated 8/24/2026 found.');
      return;
    }

    for (const row of match.rows) {
      console.log(`✏️  Updating: "${row.description}" ($${(row.amount / 100).toFixed(2)}, ${row.date_given}) → "${NEW_DESCRIPTION}"`);
    }
    const upd = await pool.query(
      `UPDATE family_contributions
       SET description = $2
       WHERE user_id = $1 AND amount = 82400 AND date_given::date = '2026-08-24'`,
      [userId, NEW_DESCRIPTION]
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
