// Adds "Sustained Focus and Deep Work" (and its child goal) to the Self Mastery and Expansion questline.
// Usage: node -r dotenv/config add-sustained-focus.cjs

const { neon } = require('@neondatabase/serverless');

const QUESTLINE = 'Self Mastery and Expansion';
const DURATION = 30;
const GOLD = Math.round(DURATION * 1.5);

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = ${QUESTLINE} LIMIT 1`;
  if (!ql.length) { console.error(`"${QUESTLINE}" questline not found`); return; }
  const qlId = ql[0].id;

  async function addTask(title, emoji, parentId, indent) {
    const found = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (found.length) { console.log(`Already exists: ${title} (id ${found[0].id})`); return found[0].id; }
    const max = await sql`SELECT COALESCE(MAX(questline_order), 0) AS max FROM tasks WHERE questline_id = ${qlId}`;
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, ${Number(max[0].max) + 1}, ${emoji}, ${parentId}, ${indent})
      RETURNING id
    `;
    console.log(`✅ Added: ${'  '.repeat(indent)}${title} (id ${row.id})`);
    return row.id;
  }

  const focusId = await addTask('Sustained Focus and Deep Work', '🎯', null, 0);
  await addTask('Be Able to Focus for 4 Hours Straight per Day Deep Work Wise', '⏱️', focusId, 1);
}

run().catch(console.error);
