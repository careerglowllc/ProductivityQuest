// Adds Aidan McHugh (content producer, marketing) to the NPC rolodex for alexbaer321@gmail.com.
// The rolodex lives in the user's `npcs-v1` value in `user_kv` (what the NPCs page syncs). Safe to re-run: it matches by
// name and the last 7 digits of the phone number, like import-iphone-contacts.cjs.
// Usage: node -r dotenv/config add-npc-aidan-mchugh.cjs

const { neon } = require('@neondatabase/serverless');

const CONTACT = {
  name: 'Aidan McHugh',
  phone: '4135391012',
  occupation: 'Content Producer, Marketing',
  category: 'Professional',
  tags: ['phone'],
};
const last7 = (s) => (s || '').replace(/\D/g, '').slice(-7);

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const row = await sql`SELECT value FROM user_kv WHERE user_id = ${userId} AND key = 'npcs-v1'`;
  const list = row.length ? JSON.parse(row[0].value || '[]') : [];
  const dupe = list.find((n) => (n.name || '').toLowerCase() === CONTACT.name.toLowerCase() && last7(n.phone) === last7(CONTACT.phone));
  if (dupe) { console.log('Already in the rolodex, id:', dupe.id); return; }

  const now = new Date().toISOString();
  const npc = {
    id: `npc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...CONTACT, location: '', howWeMet: '', notes: '', createdAt: now, updatedAt: now,
  };
  const next = [...list, npc];
  await sql`
    INSERT INTO user_kv (user_id, key, value, updated_at) VALUES (${userId}, 'npcs-v1', ${JSON.stringify(next)}, NOW())
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
  console.log(`✅ Added ${npc.name} (${npc.phone}), id: ${npc.id}. Rolodex now has ${next.length} contacts.`);
}

run().catch(console.error);
