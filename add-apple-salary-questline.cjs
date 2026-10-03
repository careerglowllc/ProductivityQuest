// Creates the "Apple Salary" questline under Financial Independence and files every
// Apple-labeled quest (apple = true OR business_work_filter = 'Apple') into it.
// Mirrors the Quests page's Apple filter. Only adopts tasks that aren't already in a
// questline, so nothing is pulled out of an existing one.
// Usage: node -r dotenv/config add-apple-salary-questline.cjs

const { neon } = require('@neondatabase/serverless');

const PARENT_QUESTLINE = 'Financial Independence';
const APPLE_SALARY = 'Apple Salary';

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const parent = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${PARENT_QUESTLINE} LIMIT 1`;
  if (!parent.length) { console.error(`"${PARENT_QUESTLINE}" questline not found`); return; }
  const parentId = parent[0].id;

  let existing = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${APPLE_SALARY} LIMIT 1`;
  let appleQlId;
  if (existing.length) {
    appleQlId = existing[0].id;
    await sql`UPDATE questlines SET parent_questline_id = ${parentId} WHERE id = ${appleQlId}`;
    console.log(`Already exists: "${APPLE_SALARY}" (id ${appleQlId}) — reparented under ${PARENT_QUESTLINE}`);
  } else {
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon, parent_questline_id)
      VALUES (${userId}, ${APPLE_SALARY}, 'Apple work that funds the salary line.', '🍎', ${parentId})
      RETURNING id
    `;
    appleQlId = row.id;
    console.log(`✅ Created questline "${APPLE_SALARY}" (id ${appleQlId}) under ${PARENT_QUESTLINE}`);
  }

  const candidates = await sql`
    SELECT id, title, completed, recycled, recycled_reason
    FROM tasks
    WHERE user_id = ${userId}
      AND (apple = true OR business_work_filter = 'Apple')
      AND questline_id IS NULL
    ORDER BY completed, id
  `;
  console.log(`Found ${candidates.length} unfiled Apple quests to adopt`);

  let order = 1;
  for (const task of candidates) {
    await sql`
      UPDATE tasks
      SET questline_id = ${appleQlId}, questline_order = ${order++}, parent_task_id = NULL, indent_level = 0
      WHERE id = ${task.id}
    `;
  }

  const summary = await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE completed)::int AS done,
           COUNT(*) FILTER (WHERE recycled AND recycled_reason = 'deleted')::int AS deleted
    FROM tasks WHERE user_id = ${userId} AND questline_id = ${appleQlId}
  `;
  const s = summary[0];
  console.log(`✅ "${APPLE_SALARY}" now holds ${s.total} quests (${s.done} completed, ${s.deleted} previously deleted)`);
}

run().catch(console.error);
