/**
 * Rename the "GitHub Copilot ..." business expense to "GitHub Copilot Pro Plus" and set it to $39/mo
 * for alexbaer321@gmail.com. Safe to run twice.
 *
 * Preview:  node update-github-copilot-pro-plus-39.cjs --dry
 * Run:      node update-github-copilot-pro-plus-39.cjs
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
const NEW_ITEM_NAME = 'GitHub Copilot Pro Plus';
const NEW_MONTHLY_COST_CENTS = 3900; // $39.00/mo
const DRY = process.argv.includes('--dry');

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
    console.log(`✅ Found user: ${userResult.rows[0].email}\n`);

    const match = await pool.query(
      `SELECT id, item, category, monthly_cost FROM financial_items
       WHERE user_id = $1 AND item ILIKE '%GitHub Copilot%'
       ORDER BY id`,
      [userId]
    );

    if (match.rows.length === 0) {
      console.log('ℹ️  No "GitHub Copilot" item found.');
      return;
    }
    if (match.rows.length > 1) {
      console.log(`⚠️  ${match.rows.length} GitHub Copilot items found; updating none. Rows:`);
      match.rows.forEach((row) => console.log(`   #${row.id} "${row.item}" $${(row.monthly_cost / 100).toFixed(2)}/mo`));
      return;
    }

    const row = match.rows[0];
    console.log(`✏️  #${row.id} "${row.item}" ($${(row.monthly_cost / 100).toFixed(2)}/mo) → "${NEW_ITEM_NAME}" ($${(NEW_MONTHLY_COST_CENTS / 100).toFixed(2)}/mo)`);
    if (DRY) {
      console.log('   (dry run: nothing changed)');
      return;
    }
    const upd = await pool.query(
      `UPDATE financial_items
       SET item = $2, monthly_cost = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $4`,
      [row.id, NEW_ITEM_NAME, NEW_MONTHLY_COST_CENTS, userId]
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
