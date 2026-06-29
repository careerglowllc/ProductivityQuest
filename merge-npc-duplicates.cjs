/**
 * Merge duplicate NPCs by identical first+last name for alexbaer321@gmail.com.
 *
 * When the same person came in from both phone and LinkedIn, this collapses them
 * into one record: union of tags, best non-empty field for each, combined notes,
 * earliest "added" date, latest "modified". Idempotent.
 *
 * Run:  node merge-npc-duplicates.cjs           (dry-run preview)
 *       node merge-npc-duplicates.cjs --apply    (write merged list)
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

const TARGET_EMAIL = 'alexbaer321@gmail.com';
const KV_KEY = 'npcs-v1';
const APPLY = process.argv.includes('--apply');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const line = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  let v = line.slice('DATABASE_URL='.length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

const norm = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const pick = (a, b) => (a && a.trim() ? a : (b || ''));
const earliest = (a, b) => (!a ? b : !b ? a : (a < b ? a : b));
const latest = (a, b) => (!a ? b : !b ? a : (a > b ? a : b));

function merge(group) {
  // Sort so the oldest (smallest createdAt) is the base — keeps original id.
  const sorted = group.slice().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  return sorted.reduce((acc, c) => ({
    ...acc,
    id: acc.id,
    name: acc.name || c.name,
    phone: pick(acc.phone, c.phone),
    occupation: pick(acc.occupation, c.occupation),
    location: pick(acc.location, c.location),
    howWeMet: pick(acc.howWeMet, c.howWeMet),
    category: acc.category && acc.category !== 'Acquaintance' ? acc.category : c.category,
    notes: [acc.notes, c.notes].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(' '),
    tags: Array.from(new Set([...(acc.tags || []), ...(c.tags || [])])),
    createdAt: earliest(acc.createdAt, c.createdAt),
    updatedAt: latest(acc.updatedAt, c.updatedAt),
  }));
}

async function main() {
  const pool = new Pool({ connectionString: loadDatabaseUrl() });
  try {
    const u = await pool.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1)`, [TARGET_EMAIL]);
    const userId = u.rows[0].id;
    const kv = await pool.query(`SELECT value FROM user_kv WHERE user_id=$1 AND key=$2`, [userId, KV_KEY]);
    const list = JSON.parse(kv.rows[0]?.value || '[]');

    const groups = new Map();
    for (const c of list) {
      const k = norm(c.name);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }

    const merged = [];
    let collapsed = 0;
    for (const [, g] of groups) {
      if (g.length === 1) { merged.push(g[0]); continue; }
      merged.push(merge(g));
      collapsed += g.length - 1;
      console.log(`🔗 ${g[0].name}: ${g.length} → 1 [${Array.from(new Set(g.flatMap((c) => c.tags || []))).join(', ')}]`);
    }

    console.log(`\n${APPLY ? 'Merged' : 'Would merge'} ${collapsed} dupes. ${list.length} → ${merged.length}.`);
    if (!APPLY) { console.log('Dry-run. Re-run with --apply to save.'); return; }

    await pool.query(
      `UPDATE user_kv SET value=$3, updated_at=NOW() WHERE user_id=$1 AND key=$2`,
      [userId, KV_KEY, JSON.stringify(merged)]
    );
    console.log('✅ Saved.');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
