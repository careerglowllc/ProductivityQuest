#!/usr/bin/env node
// One-off script to remove 'Rocklin House Rental Income' for alexbaer321@gmail.com
// Usage:
//   node scripts/remove-rocklin-rental.cjs         # dry-run
//   node scripts/remove-rocklin-rental.cjs --apply # actually delete

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const ITEM_NAME = 'Rocklin House Rental Income';
const EMAIL = 'alexbaer321@gmail.com';

async function run() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    const users = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
    if (!users || users.length === 0) {
      console.log(`No user found with email ${EMAIL}`);
      return;
    }
    const userId = users[0].id;

    const matches = await sql`
      SELECT id, item, monthly_cost FROM financial_items WHERE user_id = ${userId} AND item = ${ITEM_NAME}
    `;

    if (!matches || matches.length === 0) {
      console.log(`No matching financial_items found for user ${EMAIL} with item '${ITEM_NAME}'.`);
      return;
    }

    console.log(`Found ${matches.length} matching item(s):`);
    matches.forEach(m => console.log(`  id=${m.id} item='${m.item}' monthly_cost=${m.monthly_cost}`));

    if (process.argv.includes('--apply')) {
      const deleted = await sql`DELETE FROM financial_items WHERE user_id = ${userId} AND item = ${ITEM_NAME} RETURNING id`;
      console.log(`Deleted ${deleted.length} row(s).`);
    } else {
      console.log("Dry-run: no changes made. Re-run with --apply to delete.");
    }
  } catch (err) {
    console.error('Error running removal script:', err);
    process.exitCode = 1;
  }
}

run();
