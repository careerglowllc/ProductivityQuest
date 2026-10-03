// Updates the "Prototype for Tome and Taper" questline:
//   - Publish actual website -> complete
//   - Hire a good all-hands video producer -> complete
//   - Making the ad -> In Progress
//   - New subtask under Website Readiness: Resend / email capture setup
//   - New subtask under "Post the ad...": Compiling good hooks (In Progress)
// Completion fields mirror storage.ts's one-time-task completion path so these rows
// match app-created archive entries exactly.
// Usage: node -r dotenv/config update-tome-and-taper-progress.cjs

const { neon } = require('@neondatabase/serverless');

const DURATION = 30;
const GOLD = Math.round(DURATION * 1.5);

async function run() {
  const sql = neon(process.env.DATABASE_URL);
  const user = await sql`SELECT id FROM users WHERE email = 'alexbaer321@gmail.com' LIMIT 1`;
  if (!user.length) { console.error('User not found'); return; }
  const userId = user[0].id;

  const ql = await sql`SELECT id FROM questlines WHERE user_id = ${userId} AND title = 'Prototype for Tome and Taper' LIMIT 1`;
  if (!ql.length) { console.error('Questline not found'); return; }
  const qlId = ql[0].id;

  const tasks = await sql`SELECT id, title, questline_order FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  const find = (t) => tasks.find((x) => x.title === t);

  const websiteReadiness = find('Website Readiness');
  const publishSite = find('Publish actual website');
  const metaTrackers = find('Add meta trackers & data analytics (ad conversion, book views, on-site behavior)');
  const postAd = find('Post the ad to collect data on user interest');
  const makingAd = find('Making the ad');
  const hireProducer = find('Hire a good all-hands video producer');
  const compileRefs = find('Compile reference videos and shots for aesthetic and direction');

  const missing = Object.entries({ websiteReadiness, publishSite, metaTrackers, postAd, makingAd, hireProducer })
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('Could not find tasks:', missing); return; }

  async function complete(task) {
    await sql`
      UPDATE tasks
      SET completed = true, completed_at = NOW(), recycled = true, recycled_at = NOW(),
          recycled_reason = 'completed', kanban_stage = 'Done'
      WHERE id = ${task.id}
    `;
    console.log(`✅ Completed: ${task.title}`);
  }

  await complete(publishSite);
  await complete(hireProducer);

  // Previously inserted directly as completed without the archive flags — normalize it.
  if (compileRefs) {
    await sql`
      UPDATE tasks
      SET recycled = true, recycled_at = COALESCE(recycled_at, NOW()), recycled_reason = 'completed',
          completed_at = COALESCE(completed_at, NOW())
      WHERE id = ${compileRefs.id} AND completed = true AND recycled = false
    `;
    console.log('✅ Normalized archive flags: Compile reference videos and shots…');
  }

  await sql`UPDATE tasks SET kanban_stage = 'In Progress' WHERE id = ${makingAd.id}`;
  console.log('✅ In Progress: Making the ad');

  async function addSubtask(title, parent, order, emoji, stage) {
    const existing = await sql`SELECT id FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId} AND title = ${title} LIMIT 1`;
    if (existing.length) { console.log(`Already exists: ${title} (id ${existing[0].id})`); return existing[0].id; }
    await sql`UPDATE tasks SET questline_order = questline_order + 1 WHERE user_id = ${userId} AND questline_id = ${qlId} AND questline_order >= ${order}`;
    const parentRow = await sql`SELECT indent_level FROM tasks WHERE id = ${parent.id}`;
    const [row] = await sql`
      INSERT INTO tasks (user_id, title, description, duration, gold_value, importance, recur_type, business_work_filter, campaign, completed, skill_tags, kanban_stage, questline_id, questline_order, emoji, parent_task_id, indent_level)
      VALUES (${userId}, ${title}, '', ${DURATION}, ${GOLD}, 'Medium', '⏳One-time', 'General', 'unassigned', false, '[]'::jsonb, ${stage}, ${qlId}, ${order}, ${emoji}, ${parent.id}, ${parentRow[0].indent_level + 1})
      RETURNING id
    `;
    console.log(`✅ Added subtask: ${title} (id ${row.id}, ${stage})`);
    return row.id;
  }

  // Sits directly after the existing Website Readiness children.
  await addSubtask(
    'Set up Resend and email capture for book availability & custom book notifications',
    websiteReadiness,
    metaTrackers.questline_order + 1,
    '📧',
    'Not Started',
  );

  // Last child of "Post the ad…", so it lands after the whole "Making the ad" subtree.
  const after = await sql`SELECT MAX(questline_order) AS max FROM tasks WHERE user_id = ${userId} AND questline_id = ${qlId}`;
  await addSubtask('Compiling good hooks', postAd, Number(after[0].max) + 1, '🪝', 'In Progress');
}

run().catch(console.error);
