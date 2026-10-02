// Adds two "north star" grouping questlines to the constellation overview:
//   - Deep Fulfilling Relationships -> parent of: Looks Maximization
//   - Financial Independence -> parent of: Rocklin House Rental Prep, MailWisp Advertisement,
//     Prototype for Tome and Taper
// The grouped questlines keep all of their own tasks/subtasks unchanged — only their
// parentQuestlineId changes, which affects layout only.
// Usage: node -r dotenv/config add-north-star-groups.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  async function ensureGroup(title, icon) {
    const existing = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${title} LIMIT 1`;
    if (existing.length) return existing[0].id;
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon)
      VALUES (${userId}, ${title}, '', ${icon})
      RETURNING id
    `;
    return row.id;
  }

  const deepFulfillingRelationshipsId = await ensureGroup('Deep Fulfilling Relationships', '💞');
  const financialIndependenceId = await ensureGroup('Financial Independence', '🧭');
  console.log('✅ Group questlines ready:', { deepFulfillingRelationshipsId, financialIndependenceId });

  async function reparent(title, parentId) {
    const r = await sql`UPDATE questlines SET parent_questline_id = ${parentId} WHERE user_id = ${userId} AND title = ${title} RETURNING id`;
    if (!r.length) { console.error('Could not find questline to reparent:', title); return; }
    console.log(`✅ Reparented "${title}" (id ${r[0].id}) under questline ${parentId}`);
  }

  await reparent('Looks Maximization', deepFulfillingRelationshipsId);
  await reparent('Rocklin House Rental Prep', financialIndependenceId);
  await reparent('MailWisp Advertisement', financialIndependenceId);
  await reparent('Prototype for Tome and Taper', financialIndependenceId);
}

run().catch(console.error);
