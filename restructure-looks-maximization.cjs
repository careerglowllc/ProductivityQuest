// Restructures the "Looks Maximization" questline:
//   - Jaw Surgery: detached from the questline so it stops rendering (row kept, already
//     flagged recycled 'deleted' — reversible, not a hard delete)
//   - CPAP Test and see if Fails: un-deleted, since it is now an active parent
//   - DJS Current Status -> child of CPAP Test and see if Fails
//   - Alfi Insurance Align -> child of Jaw Optimization (Forward Projection)
//   - New child of Jaw Optimization: Dr. Wolford (Texas) — confirm schedule
// Usage: node -r dotenv/config restructure-looks-maximization.cjs

const { neon } = require('@neondatabase/serverless');

const DURATION = 30;
const GOLD = Math.round(DURATION * 1.5);

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = 'Looks Maximization' LIMIT 1`;
  if (!ql.length) { console.error('Questline not found'); return; }
  const qlId = ql[0].id;

  const tasks = await sql`SELECT id, title FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const find = (t) => tasks.find((x) => x.title.trim() === t);

  const jawSurgery = find('Jaw Surgery');
  const jawOpt = find('Jaw Optimization (Forward Projection)');
  const cpap = find('CPAP Test and see if Fails');
  const djs = find('DJS Current Status');
  const alfi = find('Alfi Insurance Align');

  const missing = Object.entries({ jawOpt, cpap, djs, alfi }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('Could not find tasks:', missing); return; }

  if (jawSurgery) {
    await sql`UPDATE tasks SET questline_id = NULL, questline_order = NULL, parent_task_id = NULL, indent_level = 0 WHERE id = ${jawSurgery.id}`;
    console.log(`✅ Removed from questline: Jaw Surgery (row #${jawSurgery.id} kept in recycle bin)`);
  }

  await sql`UPDATE tasks SET recycled = false, recycled_at = NULL, recycled_reason = NULL WHERE id = ${cpap.id}`;
  console.log('✅ Restored (was flagged deleted): CPAP Test and see if Fails');

  await sql`UPDATE tasks SET parent_task_id = ${jawOpt.id}, indent_level = 1 WHERE id = ${cpap.id}`;
  await sql`UPDATE tasks SET parent_task_id = ${cpap.id}, indent_level = 2 WHERE id = ${djs.id}`;
  console.log('✅ DJS Current Status -> child of CPAP Test and see if Fails');

  await sql`UPDATE tasks SET parent_task_id = ${jawOpt.id}, indent_level = 1 WHERE id = ${alfi.id}`;
  console.log('✅ Alfi Insurance Align -> child of Jaw Optimization (Forward Projection)');

  const wolfordTitle = 'Dr. Wolford (Texas) — confirm schedule';
  let wolford = find(wolfordTitle);
  if (wolford) {
    console.log(`Already exists: ${wolfordTitle} (id ${wolford.id})`);
  } else {
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${wolfordTitle}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, 'Not Started', ${qlId}, 999, '🗓️', ${jawOpt.id}, 1)
      RETURNING id
    `;
    wolford = { id: row.id };
    console.log(`✅ Added subtask: ${wolfordTitle} (id ${row.id})`);
  }

  // Renumber depth-first so siblings read in tree order rather than the tangled legacy order.
  const all = await sql`SELECT id, parent_task_id, questline_order FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const desiredChildOrder = [cpap.id, alfi.id, wolford.id];
  const byParent = new Map();
  all.forEach((t) => byParent.set(t.parent_task_id, [...(byParent.get(t.parent_task_id) || []), t]));
  byParent.forEach((kids, parent) => kids.sort((a, b) => {
    if (parent === jawOpt.id) return desiredChildOrder.indexOf(a.id) - desiredChildOrder.indexOf(b.id);
    return (a.questline_order ?? 0) - (b.questline_order ?? 0);
  }));
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
