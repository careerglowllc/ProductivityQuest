// Preloads Smart Focus's work-filter weighting for alexbaer321@gmail.com: Apple work counts one importance
// level higher Monday to Friday and one level lower on weekends. Merges into the existing Smart Focus memory
// (preferences, dismissals and the on/off setting are left alone) and does nothing if Apple is already set.
// Usage: node -r dotenv/config add-smart-focus-apple-priority.cjs [--dry]

const { neon } = require('@neondatabase/serverless');

const EMAIL = 'alexbaer321@gmail.com';
const KEY = 'smart-focus:memory';
const APPLE = { weekday: 1, weekend: -1 };
const DRY = process.argv.includes('--dry');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = ${EMAIL} LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const rows = await sql`SELECT id, value FROM user_kv WHERE user_id = ${userId} AND key = ${KEY} LIMIT 1`;
  const row = rows[0];
  const memory = row ? JSON.parse(row.value) : { enabled: false, preferences: [], dismissals: [] };
  memory.profile = memory.profile || {};
  memory.profile.workFilters = memory.profile.workFilters || {};
  if (memory.profile.workFilters.Apple) {
    console.log('Already set, nothing to do:', JSON.stringify(memory.profile.workFilters));
    return;
  }
  memory.profile.workFilters.Apple = APPLE;
  const value = JSON.stringify(memory);
  console.log(`${row ? 'Updating' : 'Creating'} Smart Focus memory (${memory.preferences.length} preferences kept, enabled=${memory.enabled}) with profile:`, JSON.stringify(memory.profile));
  if (DRY) { console.log('Dry run: nothing written.'); return; }

  const written = row
    ? await sql`UPDATE user_kv SET value = ${value}, updated_at = NOW() WHERE user_id = ${userId} AND key = ${KEY} AND value = ${row.value} RETURNING id`
    : await sql`INSERT INTO user_kv (user_id, key, value) VALUES (${userId}, ${KEY}, ${value}) ON CONFLICT (user_id, key) DO NOTHING RETURNING id`;
  console.log(written.length ? '✅ Apple weekday/weekend weighting saved.' : '⚠️ Memory changed while running; run the script again.');
}

run().catch((err) => { console.error(err); process.exit(1); });
