// Adds "Compile reference videos and shots for aesthetic and direction" as a completed
// subtask of "Hire a good all-hands video producer" in the Tome and Taper questline.
// Usage: node -r dotenv/config add-reference-videos-subtask.cjs

const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = 'Prototype for Tome and Taper' LIMIT 1`;
  if (!ql.length) { console.error('Questline not found'); return; }
  const qlId = ql[0].id;

  const parent = await sql`SELECT id, questline_order, indent_level FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = 'Hire a good all-hands video producer' LIMIT 1`;
  if (!parent.length) { console.error('Parent task not found'); return; }
  const { id: parentId, questline_order: parentOrder, indent_level: parentIndent } = parent[0];

  const newOrder = parentOrder + 1;
  // Make room right after the parent task for the new subtask.
  await sql`UPDATE tasks SET questline_order = questline_order + 1 WHERE user_id = ${userId} AND questline_id = ${qlId} AND questline_order >= ${newOrder}`;

  const duration = 30;
  const goldValue = Math.round(duration * 1.5);

  const [subtask] = await sql`
    INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
    VALUES (${userId}, 'Compile reference videos and shots for aesthetic and direction', '', ${duration}, ${goldValue}, 'Medium', '⏳One-time', 'General', 'unassigned', true, '[]'::jsonb, 'Done', ${qlId}, ${newOrder}, '🎞️', ${parentId}, ${parentIndent + 1})
    RETURNING id
  `;
  console.log('✅ Inserted completed subtask "Compile reference videos and shots for aesthetic and direction", id:', subtask.id);
}

run().catch(console.error);
