/**
 * Import iPhone contacts → NPC rolodex for alexbaer321@gmail.com
 *
 * Reads a vCard (.vcf) or CSV (.csv) you drop into ./import-data/, builds NPC
 * records tagged "phone", and merges them into the user's `npcs-v1` value in the
 * `user_kv` table (the same store the NPCs page syncs to across web + iOS).
 *
 * Idempotent: re-running won't duplicate — matches by name + last-7 phone digits.
 *
 * Run:  node import-iphone-contacts.cjs
 *       node import-iphone-contacts.cjs --tag linkedin --file import-data/linkedin.csv
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');

const TARGET_EMAIL = 'alexbaer321@gmail.com';
const KV_KEY = 'npcs-v1';

// --- args ---
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SOURCE_TAG = getArg('tag') || 'phone';
const FORCED_FILE = getArg('file');

// --- load DATABASE_URL from .env ---
function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return null;
  const line = fs.readFileSync(envPath, 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) return null;
  let val = line.slice('DATABASE_URL='.length).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  return val;
}

// --- find the dropped file ---
function findImportFile() {
  if (FORCED_FILE) return path.resolve(__dirname, FORCED_FILE);
  const dir = path.join(__dirname, 'import-data');
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((n) => /\.(vcf|csv)$/i.test(n));
  return f ? path.join(dir, f) : null;
}

const digits = (s) => (s || '').replace(/\D/g, '');
const last7 = (s) => digits(s).slice(-7);

// --- vCard parser ---
function parseVcf(text) {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.map((card) => {
    const get = (re) => (card.match(re) || [])[1]?.trim();
    const name = get(/\nFN[^:]*:(.+)/i) || '';
    const phone = (card.match(/\nTEL[^:]*:(.+)/i) || [])[1]?.trim();
    const occupation = get(/\n(?:ORG|TITLE)[^:]*:(.+)/i);
    const email = get(/\nEMAIL[^:]*:(.+)/i);
    const notes = get(/\nNOTE[^:]*:(.+)/i);
    return { name, phone, occupation: (occupation || '').replace(/;+$/, ''), email, notes };
  }).filter((c) => c.name);
}

// --- CSV parser (handles quoted fields) ---
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (cell || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; } }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));
  const iFirst = col('first name', 'first'), iLast = col('last name', 'last');
  const iName = col('name'), iPhone = col('mobile', 'phone', 'cell'), iEmail = col('email');
  const iCo = col('company', 'organization', 'occupation', 'title'), iLoc = col('location', 'city'), iNotes = col('notes');
  return rows.slice(1).map((r) => ({
    name: (iName >= 0 ? r[iName] : [r[iFirst], r[iLast]].filter(Boolean).join(' ')).trim(),
    phone: iPhone >= 0 ? r[iPhone] : '',
    email: iEmail >= 0 ? r[iEmail] : '',
    occupation: iCo >= 0 ? r[iCo] : '',
    location: iLoc >= 0 ? r[iLoc] : '',
    notes: iNotes >= 0 ? r[iNotes] : '',
  })).filter((c) => c.name);
}

async function main() {
  const connectionString = loadDatabaseUrl();
  if (!connectionString) { console.error('❌ DATABASE_URL not found.'); process.exit(1); }

  const file = findImportFile();
  if (!file) { console.error('❌ No .vcf/.csv in import-data/. Drop your export there first.'); process.exit(1); }
  console.log(`📄 Reading: ${path.relative(__dirname, file)}`);
  const text = fs.readFileSync(file, 'utf8');
  const parsed = /\.vcf$/i.test(file) ? parseVcf(text) : parseCsv(text);
  console.log(`   Parsed ${parsed.length} contacts. Tagging "${SOURCE_TAG}".`);
  if (!parsed.length) { console.error('❌ No contacts parsed.'); process.exit(1); }

  const pool = new Pool({ connectionString });
  try {
    const u = await pool.query(`SELECT id, email FROM users WHERE LOWER(email)=LOWER($1)`, [TARGET_EMAIL]);
    if (!u.rows.length) { console.error(`❌ ${TARGET_EMAIL} not found.`); return; }
    const userId = u.rows[0].id;
    console.log(`✅ User: ${u.rows[0].email} (${userId})`);

    const kv = await pool.query(`SELECT value FROM user_kv WHERE user_id=$1 AND key=$2`, [userId, KV_KEY]);
    let existing = [];
    try { existing = JSON.parse(kv.rows[0]?.value || '[]'); } catch {}
    const seen = new Set(existing.map((c) => `${(c.name || '').toLowerCase()}|${last7(c.phone)}`));

    let added = 0;
    const now = new Date().toISOString();
    for (const c of parsed) {
      const k = `${c.name.toLowerCase()}|${last7(c.phone)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      existing.push({
        id: `npc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: c.name, phone: c.phone || '', occupation: c.occupation || '', location: c.location || '',
        howWeMet: '', category: 'Acquaintance', notes: c.notes || '', tags: [SOURCE_TAG],
        createdAt: now, updatedAt: now,
      });
      added++;
    }

    await pool.query(
      `INSERT INTO user_kv (user_id, key, value, updated_at) VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id, key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
      [userId, KV_KEY, JSON.stringify(existing)]
    );
    console.log(`\n🎉 Imported ${added} new (${parsed.length - added} dupes skipped). Total NPCs: ${existing.length}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
