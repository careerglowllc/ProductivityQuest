// Creates the top-level "Explore Experiences" questline (a direct spoke off Your Horizon):
//   Explore Experiences
//     - Antartica prep items;            (existing task #8289, moved in)
//     - Visit Each Continent
//         - North America   (complete)
//         - South America   (complete)
//         - Asia            (complete)
//         - Africa          (not started)
//         - Antarctica      (in progress)
//         - Australia       (complete)
// Completion fields mirror storage.ts's one-time-task completion path.
// Usage: node -r dotenv/config add-explore-experiences.cjs

const { neon } = require('@neondatabase/serverless');

const QUESTLINE = 'Explore Experiences';
const DURATION = 30;
const GOLD = Math.round(DURATION * 1.5);

const CONTINENTS = [
  { title: 'North America', emoji: '🌎', status: 'complete' },
  { title: 'South America', emoji: '🌎', status: 'complete' },
  { title: 'Asia', emoji: '🌏', status: 'complete' },
  { title: 'Africa', emoji: '🌍', status: 'not-started' },
  { title: 'Antarctica', emoji: '🐧', status: 'in-progress' },
  { title: 'Australia', emoji: '🌏', status: 'complete' },
];

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  let ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${QUESTLINE} LIMIT 1`;
  let qlId;
  if (ql.length) {
    qlId = ql[0].id;
    console.log(`Already exists: "${QUESTLINE}" (id ${qlId})`);
  } else {
    const [row] = await sql`
      INSERT INTO questlines (user_id, title, description, icon)
      VALUES (${userId}, ${QUESTLINE}, 'Big experiences worth chasing.', '🌍')
      RETURNING id
    `;
    qlId = row.id;
    console.log(`✅ Created questline "${QUESTLINE}" (id ${qlId})`);
  }

  async function insertTask({ title, emoji, parentId, indent, order, status }) {
    const existing = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (existing.length) { console.log(`Already exists: ${title} (id ${existing[0].id})`); return existing[0].id; }
    const done = status === 'complete';
    const stage = done ? 'Done' : status === 'in-progress' ? 'In Progress' : 'Not Started';
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, completed_at, recycled, recycled_at, recycled_reason, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned',
              ${done}, ${done ? new Date() : null}, ${done}, ${done ? new Date() : null}, ${done ? 'completed' : null},
              '[]'::jsonb, ${stage}, ${qlId}, ${order}, ${emoji}, ${parentId}, ${indent})
      RETURNING id
    `;
    console.log(`✅ Added: ${title} (id ${row.id}, ${stage})`);
    return row.id;
  }

  // Existing Antarctica quest item (title is misspelled in the data; kept as-is).
  const antarctica = await sql`SELECT id, questline_id FROM tasks WHERE id = 8289 AND user_id = ${userId} AND title = 'Antartica prep items;'`;
  if (!antarctica.length) {
    console.error('Antartica prep items; (id 8289) not found — aborting before touching anything else');
    return;
  }
  if (antarctica[0].questline_id != null && antarctica[0].questline_id !== qlId) {
    console.error(`Antartica prep items; already belongs to questline ${antarctica[0].questline_id} — leaving it there`);
    return;
  }
  await sql`UPDATE tasks SET questline_id = ${qlId}, questline_order = 1, parent_task_id = NULL, indent_level = 0 WHERE id = 8289`;
  console.log('✅ Moved existing task into questline: Antartica prep items;');

  const visitId = await insertTask({ title: 'Visit Each Continent', emoji: '🗺️', parentId: null, indent: 0, order: 2, status: 'not-started' });
  let order = 3;
  for (const c of CONTINENTS) {
    await insertTask({ title: c.title, emoji: c.emoji, parentId: visitId, indent: 1, order: order++, status: c.status });
  }
}

run().catch(console.error);
