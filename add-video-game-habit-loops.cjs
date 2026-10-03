// Adds a "Breaking the habit loops" subtree under "Video games" in Self Mastery and Expansion:
//   Video games
//     Breaking the habit loops
//       Not going home right away and working at a coffee shop   (In Progress)
//       Eliminating going into my bedroom until time to sleep
//       Getting rid of the gaming computer in and of itself
// Usage: node -r dotenv/config add-video-game-habit-loops.cjs

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

  const videoGames = await sql`SELECT id, indent_level FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = 'Video games' LIMIT 1`;
  if (!videoGames.length) { console.error('"Video games" task not found'); return; }

  async function addTask(title, emoji, parentId, indent, stage) {
    const found = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (found.length) { console.log(`Already exists: ${title} (id ${found[0].id})`); return found[0].id; }
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, ${stage}, ${qlId}, 9999, ${emoji}, ${parentId}, ${indent})
      RETURNING id
    `;
    console.log(`✅ Added: ${'  '.repeat(indent)}${title} (id ${row.id}, ${stage})`);
    return row.id;
  }

  const base = videoGames[0].indent_level;
  const loopsId = await addTask('Breaking the habit loops', '🔁', videoGames[0].id, base + 1, 'Not Started');
  await addTask('Not going home right away and working at a coffee shop', '☕', loopsId, base + 2, 'In Progress');
  await addTask('Eliminating going into my bedroom until time to sleep', '🛏️', loopsId, base + 2, 'Not Started');
  await addTask('Getting rid of the gaming computer in and of itself', '🖥️', loopsId, base + 2, 'Not Started');

  // Renumber depth-first so the new subtree sits directly under Video games.
  const all = await sql`SELECT id, parent_task_id, questline_order FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const byParent = new Map();
  all.forEach((t) => byParent.set(t.parent_task_id, [...(byParent.get(t.parent_task_id) || []), t]));
  byParent.forEach((kids) => kids.sort((a, b) => (a.questline_order ?? 0) - (b.questline_order ?? 0) || a.id - b.id));
  let order = 1;
  const walk = async (parent) => {
    for (const task of byParent.get(parent) || []) {
      await sql`UPDATE tasks SET questline_order = ${order++} WHERE id = ${task.id}`;
      await walk(task.id);
    }
  };
  await walk(null);
  console.log(`✅ Renumbered ${order - 1} tasks in depth-first order`);
}

run().catch(console.error);
