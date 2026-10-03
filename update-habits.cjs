// Updates the habit groups in "Self Mastery and Expansion":
//   Eliminating bad habits: + Pimple Popping (In Progress)
//   Enforcing good habits:  + Consistent Sleep Schedule (done)
//                           + Routine Morning and Nighttime Skincare Routine (done)
//                           + Routine Grooming, Cologne, Teeth Brushing, and Hair Styling (done)
//                           Consistent stretching before bed -> In Progress
//                           Consistent journaling -> In Progress
// Completion fields mirror storage.ts's one-time-task completion path.
// Usage: node -r dotenv/config update-habits.cjs

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

  const tasks = await sql`SELECT id, title FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const find = (t) => tasks.find((x) => x.title === t);
  const enforcing = find('Enforcing good habits');
  const eliminating = find('Eliminating bad habits');
  const stretching = find('Consistent stretching before bed');
  const journaling = find('Consistent journaling');
  const missing = Object.entries({ enforcing, eliminating, stretching, journaling }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('Could not find tasks:', missing); return; }

  await sql`UPDATE tasks SET kanban_stage = 'In Progress' WHERE id IN (${stretching.id}, ${journaling.id})`;
  console.log('✅ In Progress: Consistent stretching before bed, Consistent journaling');

  async function addChild(title, emoji, parent, status) {
    const found = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (found.length) { console.log(`Already exists: ${title} (id ${found[0].id})`); return; }
    const done = status === 'done';
    const stage = done ? 'Done' : 'In Progress';
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, completed_at, recycled, recycled_at, recycled_reason, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned',
              ${done}, ${done ? new Date() : null}, ${done}, ${done ? new Date() : null}, ${done ? 'completed' : null},
              '[]'::jsonb, ${stage}, ${qlId}, 9999, ${emoji}, ${parent.id}, 1)
      RETURNING id
    `;
    console.log(`✅ Added: ${title} (id ${row.id}, ${stage})`);
  }

  await addChild('Consistent Sleep Schedule', '😴', enforcing, 'done');
  await addChild('Routine Morning and Nighttime Skincare Routine', '🧴', enforcing, 'done');
  await addChild('Routine Grooming, Cologne, Teeth Brushing, and Hair Styling', '💈', enforcing, 'done');
  await addChild('Pimple Popping', '😣', eliminating, 'in-progress');

  // Renumber depth-first so new children sit after their existing siblings.
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
